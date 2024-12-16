// /api/long-running-task/route.ts
import { NextResponse, NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";
import refreshToken from "@/lib/refresh-ebay-token";

const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";

interface EbayItem {
  ItemID: string;
  Title: string;
  QuantityAvailable?: string;
  Quantity?: string;
  PictureDetails?: { GalleryURL?: string };
  SellingStatus?: { CurrentPrice?: { _: string } | string };
}

async function fetchEbayItems(
  accessToken: string,
  cursor: number,
  batchSize: number
): Promise<{ items: EbayItem[]; totalPages: number; totalEntries: number }> {
  const pageNumber = cursor + 1;
  const body = `<?xml version="1.0" encoding="utf-8"?>
    <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
            <eBayAuthToken>${accessToken}</eBayAuthToken>
        </RequesterCredentials>
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <ActiveList>
            <Sort>TimeLeft</Sort>
            <Pagination>
                <EntriesPerPage>${batchSize}</EntriesPerPage>
                <PageNumber>${pageNumber}</PageNumber>
            </Pagination>
        </ActiveList>
    </GetMyeBaySellingRequest>`;
  const headers: HeadersInit = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
    "Content-Type": "text/xml",
  };
  const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
  const xml = await res.text();
  if (!res.ok) throw new Error(`Error fetching eBay items: ${res.status}`);
  const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];
  const items = Array.isArray(activeList) ? activeList : [activeList].filter(Boolean);
  const totalPages = parseInt(parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfPages || "0", 10);
  const totalEntries = parseInt(parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfEntries || "0", 10);
  return { items, totalPages, totalEntries };
}

async function fetchTransactionData(itemId: string, authToken: string): Promise<{ totalSold: number; recentSales: number }> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const body = `<?xml version="1.0" encoding="utf-8"?>
<GetItemTransactionsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>${authToken}</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>${itemId}</ItemID>
    <ModTimeFrom>${startDate.toISOString()}</ModTimeFrom>
    <ModTimeTo>${endDate.toISOString()}</ModTimeTo>
    <Pagination>
        <EntriesPerPage>100</EntriesPerPage>
        <PageNumber>1</PageNumber>
    </Pagination>
</GetItemTransactionsRequest>`;
  const headers: HeadersInit = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetItemTransactions",
    "Content-Type": "text/xml",
  };
  const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
  const xml = await res.text();
  if (!res.ok) return { totalSold: 0, recentSales: 0 };
  const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction;
  if (!transactions) return { totalSold: 0, recentSales: 0 };
  const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
  const recentSales = transactionArray.reduce((sum, txn) => sum + (parseInt(txn.QuantityPurchased, 10) || 0), 0);
  const totalSold = parseInt(parsedData.GetItemTransactionsResponse?.Item?.SellingStatus?.QuantitySold || "0", 10);
  return { totalSold, recentSales };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cursor = parseInt(req.headers.get("cursor") || "0", 10);

  try {
    const allUsers = await prisma.user.findMany();
    if (allUsers.length === 0) {
      return NextResponse.json({ message: "No users found", hasMore: false, nextCursor: null });
    }

    for (const dbUser of allUsers) {
      let ebayToken = await prisma.ebay_tokens.findUnique({ where: { user_id: dbUser.id } });
      if (!ebayToken || !ebayToken.access_token || ebayToken.expires_at <= new Date()) {
        const refreshedToken = await refreshToken(dbUser.id);
        ebayToken = ebayToken
          ? { ...ebayToken, access_token: refreshedToken.access_token, expires_at: refreshedToken.expires_at }
          : {
              id: 0,
              user_id: dbUser.id,
              created_time: new Date(),
              updated_time: new Date(),
              access_token: refreshedToken.access_token,
              refresh_token: "",
              expires_at: refreshedToken.expires_at,
            };
      }

      if (!ebayToken) continue;

      // Fetch 1 item per call
      const { items, totalPages } = await fetchEbayItems(ebayToken.access_token, cursor, 1);

      if (items.length === 0) {
        // No more items to process
        return NextResponse.json({ message: "No more items to process", hasMore: false, nextCursor: null });
      }

      const item = items[0];
      const { totalSold, recentSales } = await fetchTransactionData(item.ItemID, ebayToken.access_token);
      const price = typeof item.SellingStatus?.CurrentPrice === "object"
        ? parseFloat(item.SellingStatus?.CurrentPrice._ || "0.0")
        : parseFloat(item.SellingStatus?.CurrentPrice || "0.0");
      const quantityAvailable = parseInt(item.QuantityAvailable || item.Quantity || "0", 10);

      try {
        await prisma.inventory.upsert({
          where: { item_id: item.ItemID },
          update: {
            title: item.Title,
            price,
            quantity_available: quantityAvailable,
            total_sold: totalSold,
            recent_sales: recentSales,
            gallery_url: item.PictureDetails?.GalleryURL || "N/A",
            user_id: dbUser.user_id,
          },
          create: {
            item_id: item.ItemID,
            title: item.Title,
            price,
            quantity_available: quantityAvailable,
            total_sold: totalSold,
            recent_sales: recentSales,
            gallery_url: item.PictureDetails?.GalleryURL || "N/A",
            user_id: dbUser.user_id,
          },
        });
      } catch (itemError) {
        console.warn(`Skipping item ${item.ItemID} for user ${dbUser.id} due to error:`, (itemError as Error).message);
      }

      const hasMore = cursor + 1 < totalPages;

      // If there are more items, call the same endpoint again with nextCursor before returning
      if (hasMore) {
        // Trigger the next call recursively
        // We do not await this fetch so the process can continue asynchronously
        fetch(req.nextUrl.toString(), {
          method: "POST",
          headers: {
            cursor: String(cursor + 1),
          }
        }).catch((err) => console.error("Error triggering next recursion:", err));
      }

      return NextResponse.json({
        message: "Item processed successfully",
        hasMore,
        nextCursor: hasMore ? cursor + 1 : null,
      });
    }

    return NextResponse.json({
      message: "All users processed successfully",
      hasMore: false,
      nextCursor: null,
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "An unexpected error occurred." }, { status: 500 });
  }
}
