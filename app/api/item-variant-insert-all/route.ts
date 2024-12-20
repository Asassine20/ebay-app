import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import refreshToken from "@/lib/refresh-ebay-token";
import { parseStringPromise } from "xml2js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const ebayApiUrl = "https://api.ebay.com/ws/api.dll";

interface Variation {
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  recent_sales: number;
  picture_url: string;
}

interface EbayToken {
    access_token: string;
    expires_at: Date;
    refresh_token: string;
  }

interface RefreshedToken {
    access_token: string;
    expires_at: Date;
    refresh_token?: string; // Optional property
  }
  
// Fetch variation sales data for the last 30 days
async function fetchVariationSales(accessToken: string, itemId: string): Promise<Record<string, number>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30); // Last 30 days

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
        console.log(`No more transactions found for ItemID: ${itemId} on page ${pageNumber}`);
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

      // Check if there are more pages
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
      console.error(`Error fetching item variations for ItemID: ${itemId}, Status: ${res.status}`);
      console.error(`Raw Response Body: ${xml}`);
      return [];
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const itemDetails = parsedData.GetItemResponse?.Item;

    if (!itemDetails || !itemDetails.Variations?.Variation) {
      console.log(`No variations found for ItemID: ${itemId}`);
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
      const recentSales = salesData[name] || 0; // Fetch recent sales from salesData
      const quantityAvailable = Math.max(0, quantity - quantitySold); // Calculate available quantity

      // Match picture for this variation, if available
      const picture = pictures.find(
        (pic: any) =>
          pic.VariationSpecificValue === nameValueList.find((specific: any) => specific.Name)?.Value
      );

      return {
        name,
        price,
        quantity: quantityAvailable, // Use the calculated quantityAvailable
        quantity_sold: quantitySold,
        recent_sales: recentSales, // Include recent sales
        picture_url: picture?.PictureURL || itemDetails.PictureDetails?.PictureURL || "N/A",
      };
    });

    console.log(`Fetched ${variations.length} variations for ItemID: ${itemId}`);
    return variations;
  } catch (error) {
    console.error(`Error processing item variations for ItemID: ${itemId}`, error);
    return [];
  }
}

  
  // Update the main POST handler
  export async function POST() {
    try {
      // Fetch all users
      const { data: allUsers, error: userError } = await supabase.from("user").select("id, user_id");
  
      if (userError) {
        console.error("Error fetching users:", userError);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
      }
  
      if (!allUsers || allUsers.length === 0) {
        console.log("No users found in the database.");
        return NextResponse.json({ message: "No users found" });
      }
  
      for (const dbUser of allUsers) {
        console.log(`Processing user: ${dbUser.id}`);
  
        // Fetch eBay token for the user
        let { data: ebayToken, error: tokenError } = await supabase
          .from("ebay_tokens")
          .select("access_token, expires_at, refresh_token")
          .eq("user_id", dbUser.id)
          .single();
  
        if (tokenError) {
          console.error(`Error fetching eBay token for user ${dbUser.id}:`, tokenError);
          continue;
        }
  
        // Refresh token if expired or missing
        if (!ebayToken || !ebayToken.refresh_token || new Date(ebayToken.expires_at) <= new Date()) {
          console.log(`Refreshing eBay token for user: ${dbUser.id}`);
          try {
            const refreshedToken = await refreshToken(dbUser.id) as RefreshedToken;
  
            if (!refreshedToken || !refreshedToken.access_token) {
              console.warn(`Failed to refresh eBay token for user ${dbUser.id}, skipping.`);
              continue;
            }
  
            // Upsert the refreshed token into the database
            const { error: upsertError } = await supabase
            .from("ebay_tokens")
            .upsert(
              {
                user_id: dbUser.id,
                access_token: refreshedToken.access_token,
                refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
                expires_at: refreshedToken.expires_at,
                updated_time: new Date(),
              },
              { onConflict: "user_id" } // Ensure it matches the unique key
            );
          
          if (upsertError) {
            console.error(`Error updating eBay token for user ${dbUser.id}:`, upsertError);
            continue;
          }
          
  
            // Update local ebayToken with refreshed values
            ebayToken = {
              access_token: refreshedToken.access_token,
              refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
              expires_at: refreshedToken.expires_at,
            };
          } catch (refreshError) {
            console.error(`Error refreshing token for userId ${dbUser.id}:`, refreshError);
            continue;
          }
        }
  
        if (!ebayToken || !ebayToken.access_token) {
          console.warn(`No valid eBay token found for user ${dbUser.id}, skipping.`);
          continue;
        }
  
        // Fetch inventory items for the user
        const { data: inventoryItems, error: inventoryError } = await supabase
          .from("inventory")
          .select("id, item_id")
          .eq("user_id", dbUser.user_id);
  
        if (inventoryError) {
          console.error(`Error fetching inventory for user ${dbUser.id}:`, inventoryError);
          continue;
        }
  
        if (!inventoryItems || inventoryItems.length === 0) {
          console.log(`No inventory items found for user ${dbUser.id}, skipping.`);
          continue;
        }
  
        // Process each inventory item
        for (const inventoryItem of inventoryItems) {
          console.log(`Fetching variations for ItemID: ${inventoryItem.item_id}`);
  
          try {
            const salesData = await fetchVariationSales(ebayToken.access_token, inventoryItem.item_id);
            const variations = await fetchItemVariations(ebayToken.access_token, inventoryItem.item_id, salesData);
  
            for (const variation of variations) {
              const { error: upsertError } = await supabase.from("inventoryVariation").upsert({
                inventory_id: inventoryItem.id,
                name: variation.name,
                price: variation.price,
                quantity: variation.quantity,
                quantity_sold: variation.quantity_sold,
                recent_sales: variation.recent_sales,
                picture_url: Array.isArray(variation.picture_url)
                  ? variation.picture_url[0]
                  : variation.picture_url,
              });
  
              if (upsertError) {
                console.error(
                  `Error upserting variation for ItemID: ${inventoryItem.item_id}, Variation: ${variation.name}`,
                  upsertError
                );
              } else {
                console.log(
                  `Successfully upserted variation: ${variation.name} for ItemID: ${inventoryItem.item_id}`
                );
              }
            }
          } catch (itemError) {
            console.error(`Error processing ItemID ${inventoryItem.item_id} for user ${dbUser.id}:`, itemError);
          }
        }
  
        console.log(`Finished processing variations for user: ${dbUser.id}`);
      }
  
      return NextResponse.json({ message: "Variations processed successfully for all users" });
    } catch (error) {
      console.error("Error processing variations:", error);
      return NextResponse.json({ error: "Failed to process variations" }, { status: 500 });
    }
  }