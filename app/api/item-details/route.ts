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
      }
    });

    return salesData;
  } catch (error) {
    console.error("Error in fetchVariationSales:", error);
    return {};
  }
}

// Helper to fetch item details
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
    console.log("Item Details:", itemDetails);

    if (!itemDetails) {
      throw new Error("Item not found in the response.");
    }

    const salesData = await fetchVariationSales(itemDetails.ItemID);

    // Safe access to pictures, handle missing pictures gracefully
    const pictures =
      itemDetails.Variations?.Pictures?.VariationSpecificPictureSet || [];

      const variations = (itemDetails.Variations?.Variation || []).map((variation: any) => {
        const nameValueList = variation.VariationSpecifics?.NameValueList || {};
        const specifics = Array.isArray(nameValueList)
          ? nameValueList.map((specific: any) => `${specific.Name}: ${specific.Value}`).join(", ")
          : `${nameValueList.Name}: ${nameValueList.Value}`;
      
        const quantity = parseInt(variation.Quantity, 10) || 0;
        const quantitySold = parseInt(variation.SellingStatus?.QuantitySold, 10) || 0;
        const availableInventory = quantity - quantitySold;
      
        const variationValue = Array.isArray(nameValueList)
          ? nameValueList.find((specific: any) => specific.Name === "Choose Your Card")?.Value
          : nameValueList.Value;
      
        // Attempt to find the picture, handle cases where it's missing
        const picture = pictures.find((pic: any) => pic.VariationSpecificValue === variationValue);
      
        return {
          Name: variationValue || "N/A",
          Price: variation.StartPrice?._ || variation.StartPrice || "0.0",
          Quantity: availableInventory, // Available inventory
          QuantitySold: salesData[specifics] || 0,
          PictureURL: picture?.PictureURL || itemDetails.PictureDetails?.PictureURL || "N/A", // Default to item PictureURL
        };
      });
      

    return {
      ItemID: itemDetails.ItemID || "N/A",
      Title: itemDetails.Title || "N/A",
      Quantity: itemDetails.QuantityAvailable || "N/A",
      Variations: variations,
      TotalQuantity: itemDetails.Quantity,
      overallPrice: itemDetails.StartPrice,
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
