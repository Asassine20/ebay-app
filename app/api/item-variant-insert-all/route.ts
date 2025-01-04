import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import refreshToken from "@/lib/refresh-ebay-token";
import { parseStringPromise } from "xml2js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const ITEMS_PER_BATCH = 200;

interface Variation {
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  recent_sales: number;
  picture_url: string;
}

interface RefreshedToken {
  access_token: string;
  expires_at: Date;
  refresh_token?: string;
}

async function fetchVariationSales(accessToken: string, itemId: string): Promise<Record<string, number>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);

  const salesData: Record<string, number> = {};
  let pageNumber = 1;

  while (true) {
    const body = `<?xml version="1.0" encoding="utf-8"?>
    <GetItemTransactionsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${accessToken}</eBayAuthToken>
      </RequesterCredentials>
      <ItemID>${itemId}</ItemID>
      <ModTimeFrom>${startDate.toISOString()}</ModTimeFrom>
      <ModTimeTo>${endDate.toISOString()}</ModTimeTo>
      <Pagination>
        <EntriesPerPage>100</EntriesPerPage>
        <PageNumber>${pageNumber}</PageNumber>
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
        console.error(`Error fetching transaction data for ItemID: ${itemId}, Status: ${res.status}`);
        break;
      }

      const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
      const transactions = parsedData.GetItemTransactionsResponse?.TransactionArray?.Transaction;

      if (!transactions) {
        break;
      }

      const transactionArray = Array.isArray(transactions) ? transactions : [transactions];
      transactionArray.forEach((txn) => {
        const variationSpecifics = txn.Variation?.VariationSpecifics?.NameValueList;
        const quantityPurchased = parseInt(txn.QuantityPurchased, 10) || 0;

        if (variationSpecifics) {
          const nameValue = Array.isArray(variationSpecifics)
            ? variationSpecifics.map((specific: any) => `${specific.Name}: ${specific.Value}`).join(", ")
            : `${variationSpecifics.Name}: ${variationSpecifics.Value}`;

          salesData[nameValue] = (salesData[nameValue] || 0) + quantityPurchased;
        }
      });

      const totalPages = parseInt(parsedData.GetItemTransactionsResponse?.PaginationResult?.TotalNumberOfPages || "1", 10);
      if (pageNumber >= totalPages) break;

      pageNumber++;
    } catch (error) {
      console.error("Error in fetchVariationSales:", error);
      break;
    }
  }

  return salesData;
}

async function fetchItemVariations(
  accessToken: string,
  itemId: string,
  salesData: Record<string, number>
): Promise<Variation[]> {
  const body = `<?xml version="1.0" encoding="utf-8"?>
  <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
      <eBayAuthToken>${accessToken}</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>${itemId}</ItemID>
  </GetItemRequest>`;

  const headers: HeadersInit = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetItem",
    "Content-Type": "text/xml",
  };

  try {
    const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
    const xml = await res.text();

    if (!res.ok) {
      return [];
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const itemDetails = parsedData.GetItemResponse?.Item;

    if (!itemDetails || !itemDetails.Variations?.Variation) {
      return [];
    }

    const pictures = itemDetails.Variations?.Pictures?.VariationSpecificPictureSet || [];

    const variations = (Array.isArray(itemDetails.Variations.Variation)
      ? itemDetails.Variations.Variation
      : [itemDetails.Variations.Variation]
    ).map((variation: any): Variation => {
      const nameValueList = Array.isArray(variation.VariationSpecifics?.NameValueList)
        ? variation.VariationSpecifics.NameValueList
        : [variation.VariationSpecifics?.NameValueList];

      const name = nameValueList
        .map((specific: any) => `${specific.Name}: ${specific.Value}`)
        .join(", ");

      const price = parseFloat(variation.StartPrice?._ || variation.StartPrice || "0.0");
      const quantity = parseInt(variation.Quantity || "0", 10);
      const quantitySold = parseInt(variation.SellingStatus?.QuantitySold || "0", 10);
      const recentSales = salesData[name] || 0;

      const picture = pictures.find(
        (pic: any) =>
          pic.VariationSpecificValue === nameValueList.find((specific: any) => specific.Name)?.Value
      );

      return {
        name,
        price,
        quantity: Math.max(0, quantity - quantitySold),
        quantity_sold: quantitySold,
        recent_sales: recentSales,
        picture_url: picture?.PictureURL || itemDetails.PictureDetails?.PictureURL || "N/A",
      };
    });

    return variations;
  } catch (error) {
    return [];
  }
}

export async function POST() {
  try {
    const startProcessingTime = Date.now();
    console.log("Starting processing at:", new Date(startProcessingTime).toISOString());

    const { data: allUsers, error: userError } = await supabase.from("user").select("id, user_id");

    if (userError) {
      console.error("Error fetching users:", userError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    if (!allUsers || allUsers.length === 0) {
      console.log("No users found.");
      return NextResponse.json({ message: "No users found" });
    }

    for (const dbUser of allUsers) {
      console.log(`Processing user: ${dbUser.id}`);

      let { data: ebayToken, error: tokenError } = await supabase
        .from("ebay_tokens")
        .select("access_token, expires_at, refresh_token")
        .eq("user_id", dbUser.id)
        .single();

      if (tokenError) {
        console.error(`Error fetching eBay token for user ${dbUser.id}:`, tokenError);
        continue;
      }

      if (!ebayToken || !ebayToken.refresh_token || new Date(ebayToken.expires_at) <= new Date()) {
        console.log(`Refreshing eBay token for user: ${dbUser.id}`);
        try {
          const refreshedToken = await refreshToken(dbUser.id) as RefreshedToken;

          if (!refreshedToken || !refreshedToken.access_token) {
            console.warn(`Failed to refresh eBay token for user ${dbUser.id}, skipping.`);
            continue;
          }

          const { error: upsertError } = await supabase.from("ebay_tokens").upsert(
            {
              user_id: dbUser.id,
              access_token: refreshedToken.access_token,
              refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
              expires_at: refreshedToken.expires_at,
              updated_time: new Date(),
            },
            { onConflict: "user_id" }
          );

          if (upsertError) {
            console.error(`Error updating eBay token for user ${dbUser.id}:`, upsertError);
            continue;
          }

          ebayToken = {
            access_token: refreshedToken.access_token,
            refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
            expires_at: refreshedToken.expires_at,
          };
        } catch (refreshError) {
          console.error(`Error refreshing token for user ${dbUser.id}:`, refreshError);
          continue;
        }
      }

      const { data: inventoryItems, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, item_id")
        .eq("user_id", dbUser.user_id);

      if (inventoryError || !inventoryItems) {
        console.error(`Error fetching inventory for user ${dbUser.id}:`, inventoryError);
        continue;
      }

      for (const inventoryItem of inventoryItems) {
        console.log(`Fetching variations for ItemID: ${inventoryItem.item_id}`);

        try {
          const itemStartTime = Date.now();
          const salesData = await fetchVariationSales(ebayToken.access_token, inventoryItem.item_id);
          const variations = await fetchItemVariations(ebayToken.access_token, inventoryItem.item_id, salesData);

          console.log(`Fetched ${variations.length} variations for ItemID: ${inventoryItem.item_id} in ${(Date.now() - itemStartTime) / 1000}s.`);

          for (let i = 0; i < variations.length; i += ITEMS_PER_BATCH) {
            const batch = variations.slice(i, i + ITEMS_PER_BATCH);
            console.log(`Processing batch ${i / ITEMS_PER_BATCH + 1} with size: ${batch.length}`);
            const batchStartTime = Date.now();
            const { error: upsertError } = await supabase.from("inventoryVariation").upsert(batch);
            console.log(`Batch ${i / ITEMS_PER_BATCH + 1} processed in ${(Date.now() - batchStartTime) / 1000}s.`);
            if (upsertError) {
              console.error(`Error in batch ${i / ITEMS_PER_BATCH + 1}:`, upsertError);
            }
          }

        } catch (itemError) {
          console.error(`Error processing ItemID ${inventoryItem.item_id} for user ${dbUser.id}:`, itemError);
        }
      }

      console.log(`Finished processing user: ${dbUser.id}`);
    }

    console.log(`Total processing time: ${(Date.now() - startProcessingTime) / 1000}s.`);
    return NextResponse.json({ message: "Variations processed successfully" });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.json({ error: "Failed to process variations" }, { status: 500 });
  }
}
