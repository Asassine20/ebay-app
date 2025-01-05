import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { createClient } from "@supabase/supabase-js";
import refreshToken from "@/lib/refresh-ebay-token";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const ITEMS_PER_PAGE = 100;
const MAX_CONCURRENT_REQUESTS = 5; // Number of concurrent user requests
const ITEMS_PER_BATCH = 200; // Batch size for item processing

interface RefreshedToken {
  access_token: string;
  expires_at: Date;
  refresh_token?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cursor = JSON.parse(req.headers.get("cursor") || "{}");
  const { userIndex = 0, itemBatchIndex = 0 } = cursor;

  try {
    const { data: allUsers, error: userError } = await supabase.from("user").select("id, user_id");
    if (userError || !allUsers || allUsers.length === 0) {
      return NextResponse.json({ error: "Failed to fetch users or no users found" }, { status: 500 });
    }

    const usersToProcess = allUsers.slice(userIndex, userIndex + MAX_CONCURRENT_REQUESTS);

    if (usersToProcess.length === 0) {
      return NextResponse.json({ message: "All users processed successfully" });
    }

    await Promise.all(
      usersToProcess.map(async (dbUser) => {
        let { data: ebayToken, error: tokenError } = await supabase
          .from("ebay_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", dbUser.id)
          .single();

        if (!ebayToken || tokenError || new Date(ebayToken.expires_at) <= new Date()) {
          const refreshedToken = (await refreshToken(dbUser.id)) as RefreshedToken;
          if (!refreshedToken || !refreshedToken.access_token) {
            console.warn(`Skipping user ${dbUser.id}: Unable to refresh token`);
            return;
          }
          await supabase.from("ebay_tokens").upsert({
            user_id: dbUser.id,
            access_token: refreshedToken.access_token,
            refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
            expires_at: refreshedToken.expires_at,
          });
          ebayToken = {
            access_token: refreshedToken.access_token,
            refresh_token: refreshedToken.refresh_token || "", // Ensure fallback here too
            expires_at: refreshedToken.expires_at,
          };        }

        const items = await fetchItemsForUser(dbUser.user_id);

        const itemBatches = chunkArray(items, ITEMS_PER_BATCH); // Split items into batches
        if (itemBatches[itemBatchIndex]) {
          await Promise.all(
            itemBatches[itemBatchIndex].map((item: any) =>
              processItemTransactions(item, ebayToken!.access_token, dbUser.user_id)
            )
          );
        }
      })
    );

    const nextCursor = {
      userIndex: userIndex + MAX_CONCURRENT_REQUESTS,
      itemBatchIndex: itemBatchIndex + 1,
    };
    return NextResponse.json({ cursor: nextCursor, message: "Batch processed successfully" });
  } catch (error) {
    console.error("Error in processing:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

async function fetchItemsForUser(userId: string): Promise<any[]> {
  const { data: items, error } = await supabase
    .from("inventory")
    .select("item_id")
    .eq("user_id", userId);

  if (error || !items) {
    console.error(`Error fetching items for user ${userId}:`, error);
    return [];
  }

  return items;
}

async function processItemTransactions(item: any, accessToken: string, userId: string): Promise<void> {
  const itemId = item.item_id;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  let currentPage = 1;
  let hasMore = true;
  let totalSold = 0;
  let recentSales = 0;

  while (hasMore) {
    const body = `<?xml version="1.0" encoding="utf-8"?>
<GetItemTransactionsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>${accessToken}</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>${itemId}</ItemID>
    <ModTimeFrom>${startDate.toISOString()}</ModTimeFrom>
    <ModTimeTo>${endDate.toISOString()}</ModTimeTo>
    <Pagination>
        <EntriesPerPage>${ITEMS_PER_PAGE}</EntriesPerPage>
        <PageNumber>${currentPage}</PageNumber>
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
    if (!res.ok) throw new Error(`Error fetching transactions for item ${itemId}: ${res.status}`);

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction || [];
    const paginationResult = parsedData.GetItemTransactionsResponse?.PaginationResult;
    const totalPages = parseInt(paginationResult?.TotalNumberOfPages || "1", 10);

    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    recentSales += transactionArray.reduce(
      (sum, txn) => sum + (parseInt(txn.QuantityPurchased, 10) || 0),
      0
    );
    totalSold = parseInt(parsedData.GetItemTransactionsResponse?.Item?.SellingStatus?.QuantitySold || "0", 10);

    currentPage++;
    hasMore = currentPage <= totalPages;
  }

  const { error } = await supabase.from("inventory").update({
    total_sold: totalSold,
    recent_sales: recentSales,
  }).eq("item_id", itemId);

  if (error) {
    console.error(`Error updating transactions for item ${itemId}:`, error);
  } else {
    console.log(`Updated transactions for item ${itemId}: totalSold=${totalSold}, recentSales=${recentSales}`);
  }
}

function chunkArray(array: any[], size: number): any[][] {
  const chunks: any[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
