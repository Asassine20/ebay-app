import { NextResponse, NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { createClient } from "@supabase/supabase-js";
import refreshToken from "@/lib/refresh-ebay-token";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const ITEMS_PER_BATCH = 100;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


interface EbayItem {
  ItemID: string;
  Title: string;
  QuantityAvailable?: string;
  Quantity?: string;
  PictureDetails?: { GalleryURL?: string };
  SellingStatus?: { CurrentPrice?: { _: string } | string };
}

interface RefreshedToken {
  access_token: string;
  expires_at: Date;
  refresh_token?: string;
}

async function fetchEbayItems(
  accessToken: string,
  pageNumber: number,
  batchSize: number
): Promise<{ items: EbayItem[]; totalPages: number }> {
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

  const totalPages = parseInt(
    parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfPages || "0",
    10
  );

  return { items, totalPages };
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

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cursor = JSON.parse(req.headers.get("cursor") || "{}");
  const { userIndex = 0, currentPage = 1, batchIndex = 0 } = cursor;

  try {
    const startTime = Date.now();
    console.log(`Starting processing at: ${new Date(startTime).toISOString()}`);

    const { data: allUsers, error: userError } = await supabase.from("user").select("id, user_id");

    if (userError || !allUsers || allUsers.length === 0) {
      console.error("Error fetching users or no users found:", userError);
      return NextResponse.json({ error: "Failed to fetch users or no users found" }, { status: 500 });
    }

    if (userIndex >= allUsers.length) {
      console.log("All users processed.");
      return NextResponse.json({ message: "All users processed successfully" });
    }

    const dbUser = allUsers[userIndex];
    console.log(`Processing user ${dbUser.id}, userIndex: ${userIndex}`);

    let { data: ebayToken, error: tokenError } = await supabase
      .from("ebay_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", dbUser.id)
      .single();

    if (!ebayToken || tokenError || new Date(ebayToken.expires_at) <= new Date()) {
      console.log(`Refreshing token for user: ${dbUser.id}`);
      const refreshedToken = (await refreshToken(dbUser.id)) as RefreshedToken;

      if (!refreshedToken || !refreshedToken.access_token) {
        console.warn(`Failed to refresh token for user ${dbUser.id}, skipping.`);
        return NextResponse.json({ cursor: { userIndex: userIndex + 1, currentPage: 1, batchIndex: 0 } });
      }

      const { error: upsertError } = await supabase.from("ebay_tokens").upsert({
        user_id: dbUser.id,
        access_token: refreshedToken.access_token,
        refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
        expires_at: refreshedToken.expires_at,
        updated_time: new Date(),
      });

      if (upsertError) {
        console.error(`Error updating eBay token for user ${dbUser.id}:`, upsertError);
        return NextResponse.json({ cursor: { userIndex: userIndex + 1, currentPage: 1, batchIndex: 0 } });
      }

      ebayToken = {
        access_token: refreshedToken.access_token,
        refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
        expires_at: refreshedToken.expires_at,
      };
    }

    if (!ebayToken) {
      console.warn(`No valid eBay token found for user ${dbUser.id}, skipping.`);
      return NextResponse.json({ cursor: { userIndex: userIndex + 1, currentPage: 1, batchIndex: 0 } });
    }

    console.log(`Fetching items for user ${dbUser.id}, page: ${currentPage}`);
    const { items, totalPages } = await fetchEbayItems(ebayToken.access_token, currentPage, ITEMS_PER_BATCH);

    if (items.length === 0) {
      console.log(`No items found on page ${currentPage} for user ${dbUser.id}. Moving to the next user.`);
      return NextResponse.json({ cursor: { userIndex: userIndex + 1, currentPage: 1, batchIndex: 0 } });
    }

    console.log(`Fetched ${items.length} items from page ${currentPage} for user ${dbUser.id}`);

    for (let i = batchIndex; i < items.length; i += ITEMS_PER_BATCH) {
      const batch = items.slice(i, i + ITEMS_PER_BATCH);
      console.log(`Processing batch ${i / ITEMS_PER_BATCH + 1} for user ${dbUser.id}`);

      try {
        const upsertData = await Promise.all(
          batch.map(async (item) => {
            const { totalSold, recentSales } = await fetchTransactionData(item.ItemID, ebayToken!.access_token);
            const price =
              typeof item.SellingStatus?.CurrentPrice === "object"
                ? parseFloat(item.SellingStatus?.CurrentPrice._ || "0.0")
                : parseFloat(item.SellingStatus?.CurrentPrice || "0.0");
            const quantityAvailable = parseInt(item.QuantityAvailable || item.Quantity || "0", 10);

            return {
              item_id: item.ItemID,
              title: item.Title || "Unknown Item",
              price: price || 0.0,
              quantity_available: quantityAvailable || 0,
              total_sold: totalSold || 0,
              recent_sales: recentSales || 0,
              gallery_url: item.PictureDetails?.GalleryURL || "N/A",
              user_id: dbUser.user_id,
              last_fetched_time: new Date(),
            };
          })
        );

        await supabase.from("inventory").upsert(upsertData, { onConflict: "item_id" });
        console.log(`Batch ${i / ITEMS_PER_BATCH + 1} processed successfully for user ${dbUser.id}`);
      } catch (batchError) {
        console.error(`Error processing batch ${i / ITEMS_PER_BATCH + 1} for user ${dbUser.id}:`, batchError);
      }

      if (Date.now() - startTime > 8000) {
        console.log(`Timeout approaching. Recursively calling API with cursor for next batch.`);
        await delay(500); // Add a small delay to avoid overwhelming the server
        await fetch("https://www.restockradar.com/api/item-insert-all", {
          method: "POST",
          headers: { "Content-Type": "application/json", cursor: JSON.stringify({ userIndex, currentPage, batchIndex: i + ITEMS_PER_BATCH }) },
        });
        return NextResponse.json({ message: "Recursive call initiated." });
      }
    }

    if (currentPage < totalPages) {
      console.log(`Moving to next page for user ${dbUser.id}`);
      await delay(500); // Add a small delay
      await fetch("https://www.restockradar.com/api/item-insert-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", cursor: JSON.stringify({ userIndex, currentPage: currentPage + 1, batchIndex: 0 }) },
      });
      return NextResponse.json({ message: "Recursive call initiated for next page." });
    }

    console.log(`Finished processing user ${dbUser.id}`);
    await delay(500); // Add a small delay
    await fetch("https://www.restockradar.com/api/item-insert-all", {
      method: "POST",
      headers: { "Content-Type": "application/json", cursor: JSON.stringify({ userIndex: userIndex + 1, currentPage: 1, batchIndex: 0 }) },
    });
    return NextResponse.json({ message: "Recursive call initiated for next user." });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}