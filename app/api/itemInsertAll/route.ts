import { NextResponse, NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";
import refreshToken from "@/lib/refresh-ebay-token";

const prisma = new PrismaClient();
const ITEMS_PER_BATCH = 10;
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
  const allItems: EbayItem[] = [];
  const pageNumber = cursor + 1;

  try {
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

    if (!res.ok) {
      console.error(`Error fetching eBay items: ${res.status}`);
      throw new Error(`Error fetching eBay items: ${res.status}`);
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];
    const items = Array.isArray(activeList) ? activeList : [activeList];
    const totalPages = parseInt(parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfPages || "0", 10);
    const totalEntries = parseInt(parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfEntries || "0", 10);

    allItems.push(...items);
    return { items: allItems, totalPages, totalEntries };
  } catch (error) {
    console.error("Error in fetchEbayItems:", (error as Error).message);
    throw error;
  }
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

  try {
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
    const xml = await res.text();

    if (!res.ok) {
      console.error(`Error fetching transactions for ItemID ${itemId}: ${res.status}`);
      return { totalSold: 0, recentSales: 0 };
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction;

    if (!transactions) {
      return { totalSold: 0, recentSales: 0 };
    }

    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    const recentSales = transactionArray.reduce((sum, txn) => {
      const quantity = parseInt(txn.QuantityPurchased, 10) || 0;
      return sum + quantity;
    }, 0);

    const totalSold = parseInt(parsedData.GetItemTransactionsResponse?.Item?.SellingStatus?.QuantitySold || "0", 10);
    return { totalSold, recentSales };
  } catch (error) {
    console.error(`Error fetching transactions for ItemID ${itemId}:`, (error as Error).message);
    return { totalSold: 0, recentSales: 0 };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cursor = parseInt(req.headers.get("cursor") || "0", 10);

  try {
    const allUsers = await prisma.user.findMany();
    if (allUsers.length === 0) {
      return NextResponse.json({ message: "No users found", hasMore: false, nextCursor: null });
    }

    let anyHasMore = false;
    let nextCursorValue: number | null = null;

    for (const dbUser of allUsers) {
      let ebayToken = await prisma.ebay_tokens.findUnique({ where: { user_id: dbUser.id } });
      if (!ebayToken || !ebayToken.access_token || ebayToken.expires_at <= new Date()) {
        const refreshedToken = await refreshToken(dbUser.id);
        if (ebayToken) {
          ebayToken = {
            ...ebayToken,
            access_token: refreshedToken.access_token,
            expires_at: refreshedToken.expires_at,
          };
        } else {
          ebayToken = {
            id: 0,
            user_id: dbUser.id,
            created_time: new Date(),
            updated_time: new Date(),
            access_token: refreshedToken.access_token,
            refresh_token: "",
            expires_at: refreshedToken.expires_at,
          };
        }
      }

      if (!ebayToken) {
        console.warn(`No valid token for user ${dbUser.id}, skipping.`);
        continue;
      }

      const { items, totalPages } = await fetchEbayItems(
        ebayToken.access_token,
        cursor,
        ITEMS_PER_BATCH
      );

      for (const item of items) {
        try {
          const { totalSold, recentSales } = await fetchTransactionData(item.ItemID, ebayToken.access_token);
          const price =
            typeof item.SellingStatus?.CurrentPrice === "object"
              ? parseFloat(item.SellingStatus?.CurrentPrice._ || "0.0")
              : parseFloat(item.SellingStatus?.CurrentPrice || "0.0");
          const quantityAvailable = parseInt(item.QuantityAvailable || item.Quantity || "0", 10);

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
          if (itemError instanceof Error) {
            console.warn(`Skipping item ${item.ItemID} for user ${dbUser.id} due to error:`, itemError.message);
          } else {
            console.warn(`Skipping item ${item.ItemID} for user ${dbUser.id} due to an unknown error.`);
          }
        }
      }

      const hasMore = cursor + 1 < totalPages;
      if (hasMore) {
        anyHasMore = true;
        nextCursorValue = cursor + 1;
      }
    }

    return NextResponse.json({
      message: "All users processed successfully",
      hasMore: anyHasMore,
      nextCursor: anyHasMore ? nextCursorValue : null,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in GET handler:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error("Unexpected error in GET handler:", error);
      return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
  }
}
