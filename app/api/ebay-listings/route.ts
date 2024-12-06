import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { Redis } from "@upstash/redis";
// Cache results
const redis = new Redis ({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
;
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

// Helper function to fetch sales data
async function fetchTransactionData(itemId: string): Promise<number> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Last 30 days

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

  const headers = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetItemTransactions",
    "X-EBAY-API-IAF-TOKEN": authToken!,
    "Content-Type": "text/xml",
  };

  try {
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });

    if (!res.ok) {
      console.error(`Error fetching transaction data for ItemID: ${itemId}, Status: ${res.status}`);
      return 0;
    }

    const xml = await res.text();
    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction;

    if (!transactions) return 0;

    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    const totalQuantitySold = transactionArray.reduce((sum, txn) => {
      return sum + (parseInt(txn.QuantityPurchased, 10) || 0);
    }, 0);

    return totalQuantitySold;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return 0;
  }
}

// Main API function
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const entriesPerPage = searchParams.get("entriesPerPage") || "200";
  const cacheKey = `ebay-listings-page-${page}-entries-${entriesPerPage}`;

  // Check Redis for cached data
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    console.log("Serving data from cache");
    return NextResponse.json(cachedData);
  }
  if (!authToken) {
    console.error("Missing eBay auth token");
    return NextResponse.json({ error: "Missing eBay auth token" }, { status: 400 });
  }

  const body = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>${authToken}</eBayAuthToken>
    </RequesterCredentials>
    <ErrorLanguage>en_US</ErrorLanguage>
    <WarningLevel>High</WarningLevel>
    <ActiveList>
        <Sort>TimeLeft</Sort>
        <Pagination>
            <EntriesPerPage>${entriesPerPage}</EntriesPerPage>
            <PageNumber>${page}</PageNumber>
        </Pagination>
    </ActiveList>
</GetMyeBaySellingRequest>`;

  const headers = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
    "X-EBAY-API-IAF-TOKEN": authToken!,
    "Content-Type": "text/xml",
  };

  try {
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
  
    if (!res.ok) {
      console.error(`eBay API returned status: ${res.status}`);
      return NextResponse.json({ error: `eBay API returned status ${res.status}` }, { status: res.status });
    }
  
    const xml = await res.text();
  
    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  
    const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];
  
    if (!activeList || activeList.length === 0) {
      console.log("No items found in the API response.");
      return NextResponse.json([]);
    }
    
    const items = Array.isArray(activeList) ? activeList : [activeList];
    
    const parsedItems = await Promise.all(
      items.map(async (item: any) => {
        const itemId = item.ItemID || "N/A";
        const title = item.Title || "N/A";
        const price =
          item.SellingStatus?.CurrentPrice?._ || item.SellingStatus?.CurrentPrice || "0.0";
        const quantity = item.QuantityAvailable || "0";
        const totalSold = await fetchTransactionData(itemId);
        const galleryURL = item.PictureDetails?.GalleryURL || ""; // Extract GalleryURL
    
        const variations = (item.Variations?.Variation || []).map((variation: any) => {
          const nameValueList = variation.VariationSpecifics?.NameValueList;
          const specifics = Array.isArray(nameValueList)
            ? nameValueList.map((specific: any) => ({
                Name: specific.Name || "Unknown",
                Value: specific.Value || "Unknown",
              }))
            : nameValueList
            ? [
                {
                  Name: nameValueList.Name || "Unknown",
                  Value: nameValueList.Value || "Unknown",
                },
              ]
            : [];
    
          return {
            Price: variation.StartPrice?._ || variation.StartPrice || "0.0",
            Quantity: variation.Quantity || "0",
            Specifics: specifics,
          };
        });
    
        return {
          ItemID: itemId,
          Title: title,
          Price: price,
          Quantity: quantity,
          TotalSold: totalSold,
          GalleryURL: galleryURL, // Add GalleryURL to parsed item
          Variations: variations,
        };
      })
    );
  

    await redis.set(cacheKey, parsedItems, { ex: 86400 });
  
    return NextResponse.json(parsedItems);
  } catch (error: any) {
    console.error("Error in GET /api/ebay-listings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
}

// Additional POST endpoint to clear the cache manually
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const entriesPerPage = searchParams.get("entriesPerPage") || "200";
  const cacheKey = `ebay-listings-page-${page}-entries-${entriesPerPage}`;

  try {
    await redis.del(cacheKey);
    return NextResponse.json({ message: "Cache cleared successfully" });
  } catch (error: any) {
    console.error("Error clearing cache:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}