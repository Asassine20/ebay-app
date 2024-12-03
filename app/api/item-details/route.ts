import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";

const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

// Helper to fetch sales data for a specific variation
async function fetchVariationSales(itemId: string, specifics: any[]): Promise<number> {
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

    if (!transactions) {
      console.log("No transactions found for ItemID:", itemId);
      return 0;
    }

    const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
    let totalSales = 0;

    transactionArray.forEach((txn) => {
      const variationSpecifics = txn.Variation?.VariationSpecifics?.NameValueList || [];
      const isMatchingVariation = specifics.every((specific) =>
        variationSpecifics.some(
          (txnSpecific: any) =>
            txnSpecific.Name === specific.Name && txnSpecific.Value === specific.Value
        )
      );

      if (isMatchingVariation) {
        const quantity = parseInt(txn.QuantityPurchased, 10) || 0;
        totalSales += quantity;
        console.log(
          `Matched transaction for Variation: ${JSON.stringify(specifics)} - Quantity Sold: ${quantity}`
        );
      }
    });

    return totalSales;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return 0;
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
    if (!res.ok) {
      throw new Error(`eBay API returned status ${res.status}`);
    }

    const xml = await res.text();
    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const itemDetails = parsedData.GetItemResponse?.Item;

    if (!itemDetails) {
      throw new Error("Item not found in the response.");
    }

    const variations = await Promise.all(
      (itemDetails.Variations?.Variation || []).map(async (variation: any) => {
        const nameValueList = variation.VariationSpecifics?.NameValueList;
        const specifics = Array.isArray(nameValueList)
          ? nameValueList.map((specific: any) => ({
              Name: specific.Name || "Unknown",
              Value: specific.Value || "Unknown",
            }))
          : [];

        const sales = await fetchVariationSales(itemDetails.ItemID, specifics);

        const variationName = specifics
          .map((specific) => `${specific.Name}: ${specific.Value}`)
          .join(", ");

        return {
          Name: variationName || "N/A",
          Price: variation.StartPrice?._ || variation.StartPrice || "0.0",
          Quantity: variation.Quantity || "0",
          Sales: sales,
          Specifics: specifics,
        };
      })
    );

    return {
      ItemID: itemDetails.ItemID || "N/A",
      Title: itemDetails.Title || "N/A",
      Price: itemDetails.SellingStatus?.CurrentPrice?._ || "0.0",
      Quantity: itemDetails.QuantityAvailable || "0",
      Variations: variations,
    };
  } catch (error) {
    console.error("Error fetching item details:", error);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
