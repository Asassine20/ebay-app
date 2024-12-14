import { NextResponse, NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";
import refreshToken from "@/lib/refresh-ebay-token";


const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";

// Type for eBay item
interface EbayItem {
  ItemID: string;
  Title: string;
  QuantityAvailable?: string;
  Quantity?: string;
  PictureDetails?: {
    GalleryURL?: string;
  };
  SellingStatus?: {
    CurrentPrice?: { _: string } | string;
  };
}

async function fetchEbayItems(accessToken: string): Promise<EbayItem[]> {
    const MAX_ITEMS = 5000;
    const ITEMS_PER_PAGE = 200;
    const allItems: EbayItem[] = [];
  
    try {
      let currentPage = 1;
      let totalFetched = 0;
  
      console.log("Starting eBay fetch with accessToken:", accessToken);
  
      while (totalFetched < MAX_ITEMS) {
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
              <EntriesPerPage>${ITEMS_PER_PAGE}</EntriesPerPage>
              <PageNumber>${currentPage}</PageNumber>
          </Pagination>
      </ActiveList>
  </GetMyeBaySellingRequest>`;
  
        const headers: HeadersInit = {
          "X-EBAY-API-SITEID": "0",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
          "Content-Type": "text/xml",
        };
  
        console.log(`Fetching page ${currentPage} of eBay items...`);
        console.log("Request Headers:", headers);
        console.log("Request Body:", body);
  
        const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
        const xml = await res.text();
  
        if (!res.ok) {
          console.error(`Error fetching eBay items (status: ${res.status}):`, xml);
          throw new Error(`Error fetching eBay items: ${res.status}`);
        }
  
        console.log(`eBay API Response XML for page ${currentPage}:`, xml);
  
        const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  
        const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];
        const items = Array.isArray(activeList) ? activeList : [activeList];
  
        console.log(`Fetched ${items.length} items on page ${currentPage}`);
        allItems.push(...items);
        totalFetched += items.length;
  
        if (items.length < ITEMS_PER_PAGE) {
          console.log("Reached end of available items.");
          break;
        }
  
        currentPage++;
      }
  
      console.log("Total items fetched:", allItems.length);
      return allItems.slice(0, MAX_ITEMS);
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
    console.log(`Fetching transactions for ItemID: ${itemId}`);
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
    const xml = await res.text();

    if (!res.ok) {
      console.error(`Error fetching transactions for ItemID ${itemId}: ${res.status}`);
      return { totalSold: 0, recentSales: 0 };
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction;

    if (!transactions) {
      console.log(`No transactions found for ItemID: ${itemId}`);
      return { totalSold: 0, recentSales: 0 };
    }

    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    const recentSales = transactionArray.reduce((sum, txn) => {
      const quantity = parseInt(txn.QuantityPurchased, 10) || 0;
      return sum + quantity;
    }, 0);

    const totalSold = parseInt(parsedData.GetItemTransactionsResponse?.Item?.SellingStatus?.QuantitySold || "0", 10);

    console.log(`Total sold: ${totalSold}, Recent sales: ${recentSales} for ItemID: ${itemId}`);
    return { totalSold, recentSales };
  } catch (error) {
    console.error(`Error fetching transactions for ItemID ${itemId}:`, (error as Error).message);
    return { totalSold: 0, recentSales: 0 };
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const userId = req.headers.get("user-id");
  
    if (!userId) {
      console.error("Missing userId in request headers");
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }
  
    try {
      console.log(`Headers userId: ${userId}`);
  
      // Fetch the user from the database
      const dbUser = await prisma.user.findUnique({
        where: { id: parseInt(userId, 10) },
      });
  
      if (!dbUser) {
        console.error(`No user found for userId: ${userId}`);
        return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
      }
  
      // Fetch the user's eBay token
      let ebayToken = await prisma.ebay_tokens.findUnique({
        where: { user_id: dbUser.id },
      });
  
      if (!ebayToken) {
        console.error(`No eBay token found for userId: ${userId}`);
        return NextResponse.json({ error: "eBay token not found for user" }, { status: 400 });
      }
  
      // Check if token is expired or invalid
      const now = new Date();
      if (!ebayToken.access_token || ebayToken.expires_at <= now) {
        console.log("Access token expired or missing. Refreshing token...");
        
        try {
          const refreshedToken = await refreshToken(dbUser.id);
          ebayToken = {
            ...ebayToken,
            access_token: refreshedToken.access_token,
            expires_at: refreshedToken.expires_at,
          };
          console.log("Token refreshed successfully");
        } catch (refreshError) {
          console.error("Failed to refresh token:", (refreshError as Error).message);
          return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
        }
      }
  
      const accessToken = ebayToken.access_token;
  
      // Fetch eBay items using the access token
      const items = await fetchEbayItems(accessToken);
      console.log(`Total items fetched: ${items.length}`);
  
      for (const item of items) {
        try {
          const { totalSold, recentSales } = await fetchTransactionData(item.ItemID, accessToken);
  
          const price =
            typeof item.SellingStatus?.CurrentPrice === "object"
              ? parseFloat(item.SellingStatus?.CurrentPrice._ || "0.0")
              : parseFloat(item.SellingStatus?.CurrentPrice || "0.0");
          const quantityAvailable = parseInt(item.QuantityAvailable || item.Quantity || "0", 10);
  
          console.log(`Processing item: ${item.ItemID} (Title: ${item.Title})`);
  
          // Insert or update item in the database
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
  
          console.log(`Item ${item.ItemID} saved successfully for user.user_id: ${dbUser.user_id}`);
        } catch (itemError) {
          console.warn(`Skipping item ${item.ItemID} due to error:`, (itemError as Error).message);
        }
      }
  
      return NextResponse.json({ message: `Items saved successfully, total processed: ${items.length}.` });
    } catch (error) {
      console.error("Error in GET handler:", (error as Error).message);
      return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
  }
  