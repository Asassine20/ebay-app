import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

async function fetchEbayItems() {
    const MAX_ITEMS = 5000;
    const ITEMS_PER_PAGE = 200;
    const allItems = [];
  
    try {
      let currentPage = 1;
      let totalFetched = 0;
  
      while (totalFetched < MAX_ITEMS) {
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
              <EntriesPerPage>${ITEMS_PER_PAGE}</EntriesPerPage>
              <PageNumber>${currentPage}</PageNumber>
          </Pagination>
      </ActiveList>
  </GetMyeBaySellingRequest>`;
  
        const headers = {
          "X-EBAY-API-SITEID": "0",
          "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
          "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
          "X-EBAY-API-IAF-TOKEN": authToken,
          "Content-Type": "text/xml",
        };
  
        const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
        const xml = await res.text();
  
        if (!res.ok) {
          throw new Error(`Error fetching eBay items: ${res.status}`);
        }
  
        const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
        const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];
  
        const items = Array.isArray(activeList) ? activeList : [activeList];
        allItems.push(...items);
        totalFetched += items.length;
  
        if (items.length < ITEMS_PER_PAGE) {
          // If fewer than ITEMS_PER_PAGE items are returned, we reached the end
          break;
        }
  
        currentPage++;
      }
  
      return allItems.slice(0, MAX_ITEMS); // Enforce the MAX_ITEMS limit
    } catch (error) {
      console.error("Error in fetchEbayItems:", error);
      throw error;
    }
  }

async function fetchTransactionData(itemId) {
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

  const headers = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetItemTransactions",
    "X-EBAY-API-IAF-TOKEN": authToken,
    "Content-Type": "text/xml",
  };

  try {
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
    const xml = await res.text();

    if (!res.ok) {
      console.error(`Error fetching transactions for ItemID ${itemId}`);
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

    return { totalSold, recentSales };
  } catch (error) {
    console.error(`Error fetching transactions for ItemID ${itemId}:`, error);
    return { totalSold: 0, recentSales: 0 };
  }
}

export async function GET(req) {
    const userId = req.headers.get("user-id");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }
  
    try {
      const items = await fetchEbayItems();
  
      for (const item of items) {
        try {
          const { totalSold, recentSales } = await fetchTransactionData(item.ItemID);
  
          const price = parseFloat(item.SellingStatus?.CurrentPrice?._ || item.SellingStatus?.CurrentPrice || "0.0");
          const quantityAvailable = parseInt(item.QuantityAvailable || item.Quantity || "0", 10);
  
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
              user_id: userId,
            },
            create: {
              item_id: item.ItemID,
              title: item.Title,
              price,
              quantity_available: quantityAvailable,
              total_sold: totalSold,
              recent_sales: recentSales,
              gallery_url: item.PictureDetails?.GalleryURL || "N/A",
              user_id: userId,
            },
          });
        } catch (itemError) {
          console.warn(`Skipping item ${item.ItemID} due to error: ${itemError.message}`);
        }
      }
  
      return NextResponse.json({ message: `Items saved successfully, total processed: ${items.length}.` });
    } catch (error) {
      console.error("Error in GET handler:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }