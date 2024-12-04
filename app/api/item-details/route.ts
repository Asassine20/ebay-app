import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";

const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

// Helper to fetch sales data for a specific variation
async function fetchVariationSales(itemId: string): Promise<Record<string, number>> {
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
    const xml = await res.text();

    if (!res.ok) {
      console.error(`Error fetching transaction data for ItemID: ${itemId}, Status: ${res.status}`);
      return {};
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    console.log("Parsed API Response for fetchVariationSales:", parsedData);

    const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction;

    if (!transactions) {
      console.log(`No transactions found for ItemID: ${itemId}`);
      return {};
    }

    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    const salesData: Record<string, number> = {};

    transactionArray.forEach((txn) => {
      const variationSpecifics = txn.Variation?.VariationSpecifics?.NameValueList;
      if (variationSpecifics) {
        const nameValue = Array.isArray(variationSpecifics)
          ? variationSpecifics.map((specific: any) => `${specific.Name}: ${specific.Value}`).join(", ")
          : `${variationSpecifics.Name}: ${variationSpecifics.Value}`;
        const quantity = parseInt(txn.QuantityPurchased, 10) || 0;

        salesData[nameValue] = (salesData[nameValue] || 0) + quantity;
        console.log(`Variation: ${nameValue}, Quantity Sold: ${quantity}`);
      }
    });

    return salesData;
  } catch (error) {
    console.error("Error in fetchVariationSales:", error);
    return {};
  }
}

// Helper to fetch item details
async function getItemDetails(itemId: string) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>${authToken}</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>${itemId}</ItemID>
</GetItemRequest>`;

  const headers = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetItem",
    "X-EBAY-API-IAF-TOKEN": authToken!,
    "Content-Type": "text/xml",
  };

  try {
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
    const xml = await res.text();

    if (!res.ok) {
      throw new Error(`eBay API returned status ${res.status}`);
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const itemDetails = parsedData.GetItemResponse?.Item;

    if (!itemDetails) {
      throw new Error("Item not found in the response.");
    }

    const salesData = await fetchVariationSales(itemDetails.ItemID);

    const variations = (itemDetails.Variations?.Variation || []).map((variation: any) => {
      const nameValueList = variation.VariationSpecifics?.NameValueList || [];
      const specifics = Array.isArray(nameValueList)
        ? nameValueList.map((specific: any) => `${specific.Name}: ${specific.Value}`).join(", ")
        : `${nameValueList.Name}: ${nameValueList.Value}`;
    
      return {
        Name: specifics,
        Price: variation.StartPrice?._ || variation.StartPrice || "0.0",
        Quantity: variation.Quantity || "0", // Use QuantityAvailable if present
        QuantitySold: salesData[specifics] || 0,
      };
    });
    

    return {
      ItemID: itemDetails.ItemID || "N/A",
      Title: itemDetails.Title || "N/A",
      Quantity: itemDetails.QuantityAvailable || "N/A",
      Variations: variations,
    };
  } catch (error) {
    console.error("Error in getItemDetails:", error);
    throw error;
  }
}

// Main API handler
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId parameter" }, { status: 400 });
  }

  try {
    const itemDetails = await getItemDetails(itemId);
    return NextResponse.json(itemDetails);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
