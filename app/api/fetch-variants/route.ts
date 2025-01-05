// gets variant details and the variant sales data
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import refreshToken from "@/lib/refresh-ebay-token";
import { parseStringPromise } from "xml2js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const ITEMS_PER_BATCH = 200;

interface RefreshedToken {
  access_token: string;
  expires_at: Date;
  refresh_token?: string;
}

let processedItemsCount = 0; // Counter to track processed items

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const cursor = JSON.parse(req.headers.get("cursor") || "{}");
  const { userIndex = 0, itemIndex = 0 } = cursor;

  try {
    // Fetch all users
    const { data: allUsers, error: userError } = await supabase.from("user").select("id, user_id");
    if (userError || !allUsers || allUsers.length === 0) {
      return NextResponse.json({ error: "Failed to fetch users or no users found" }, { status: 500 });
    }

    if (userIndex >= allUsers.length) {
      return NextResponse.json({
        message: `All users processed successfully. Total items processed: ${processedItemsCount}`,
      });
    }

    const dbUser = allUsers[userIndex];
    console.log(`Processing user ${dbUser.id}`);

    // Fetch eBay token for user
    let { data: ebayToken, error: tokenError } = await supabase
      .from("ebay_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", dbUser.id)
      .single();

    if (!ebayToken || tokenError) {
      console.warn(`Skipping user ${dbUser.id}: No eBay token found.`);
      return initiateNextBatch(userIndex + 1, 0);
    }

    // Refresh eBay token if expired
    if (new Date(ebayToken.expires_at) <= new Date()) {
      console.log(`Refreshing eBay token for user ${dbUser.id}`);
      const refreshedToken = (await refreshToken(dbUser.id)) as RefreshedToken;
      if (!refreshedToken || !refreshedToken.access_token) {
        console.warn(`Skipping user ${dbUser.id}: Unable to refresh token.`);
        return initiateNextBatch(userIndex + 1, 0);
      }

      await supabase.from("ebay_tokens").upsert({
        user_id: dbUser.id,
        access_token: refreshedToken.access_token,
        refresh_token: refreshedToken.refresh_token || ebayToken.refresh_token || "",
        expires_at: refreshedToken.expires_at,
      });

      ebayToken = {
        access_token: refreshedToken.access_token,
        refresh_token: refreshedToken.refresh_token || "",
        expires_at: refreshedToken.expires_at,
      };
    }

    // Fetch inventory items for user
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, item_id")
      .eq("user_id", dbUser.user_id);

    if (inventoryError || !inventoryItems || inventoryItems.length === 0) {
      console.warn(`No inventory items found for user ${dbUser.id}.`);
      return initiateNextBatch(userIndex + 1, 0);
    }

    console.log(`Fetched ${inventoryItems.length} items for user ${dbUser.id}`);

    // Process inventory items in batches
    for (let i = itemIndex; i < inventoryItems.length; i += ITEMS_PER_BATCH) {
      const batch = inventoryItems.slice(i, i + ITEMS_PER_BATCH);

      console.log(`Processing batch from item ${i} to ${i + ITEMS_PER_BATCH}`);

      await Promise.all(
        batch.map(async (item) => {
          try {
            console.log(`Processing item ${item.item_id}`);
            const variations = await fetchItemVariations(ebayToken!.access_token, item.item_id);

            if (variations.length > 0) {
              console.log(`Found ${variations.length} variations for item ${item.item_id}`);
              const mappedVariations = variations.map((variation) => ({
                inventory_id: item.id,
                name: variation.name,
                price: variation.price,
                quantity: variation.quantity,
                quantity_sold: variation.quantity_sold,
                picture_url: variation.picture_url || null,
                recent_sales: variation.recent_sales || 0,
              }));

              const { error: upsertError } = await supabase
                .from("inventoryVariation")
                .upsert(mappedVariations, { onConflict: "inventory_id,name" });

              if (upsertError) {
                console.error(`Error upserting variations for ItemID: ${item.item_id}:`, upsertError);
              } else {
                console.log(`Upserted variations for ItemID: ${item.item_id}`);
              }
            } else {
              console.log(`No variations found for ItemID: ${item.item_id}`);
            }
          } catch (error) {
            console.error(`Error processing item ${item.item_id}:`, error);
          }
          processedItemsCount++;
        })
      );

      console.log(`Finished processing batch from item ${i} to ${i + ITEMS_PER_BATCH}`);

      // If close to timeout, return cursor for next batch
      if (Date.now() - startTime > 48000) {
        console.log("Approaching timeout. Initiating next batch.");
        return reInvokeAPI(userIndex, i + ITEMS_PER_BATCH);
      }
    }

    console.log(`Finished processing all items for user ${dbUser.id}`);
    return reInvokeAPI(userIndex + 1, 0);
  } catch (error) {
    console.error("Error in processing:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

async function reInvokeAPI(userIndex: number, itemIndex: number): Promise<NextResponse> {
  const nextCursor = { userIndex, itemIndex };
  const res = await fetch("https://www.restockradar.com/api/fetch-variants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cursor: JSON.stringify(nextCursor),
    },
  });
  console.log(`Reinvoked API with cursor: ${JSON.stringify(nextCursor)}`);
  return res.ok
    ? NextResponse.json({ message: "Batch re-invocation successful." })
    : NextResponse.json({ error: "Failed to re-invoke API." }, { status: 500 });
}


async function fetchItemVariations(accessToken: string, itemId: string): Promise<any[]> {
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

  const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
  const xml = await res.text();
  if (!res.ok) throw new Error(`Error fetching item variations for ItemID: ${itemId}, Status: ${res.status}`);

  const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  const itemDetails = parsedData.GetItemResponse?.Item;

  if (!itemDetails || !itemDetails.Variations?.Variation) {
    return [];
  }

  return (Array.isArray(itemDetails.Variations.Variation)
    ? itemDetails.Variations.Variation
    : [itemDetails.Variations.Variation]
  ).map((variation: any) => ({
    name: (Array.isArray(variation.VariationSpecifics?.NameValueList)
      ? variation.VariationSpecifics.NameValueList
      : [variation.VariationSpecifics?.NameValueList]
    )
      .map((specific: any) => `${specific.Name}: ${specific.Value}`)
      .join(", "),
    price: parseFloat(variation.StartPrice?._ || variation.StartPrice || "0.0"),
    quantity: parseInt(variation.Quantity || "0", 10),
    quantity_sold: parseInt(variation.SellingStatus?.QuantitySold || "0", 10),
    picture_url: variation.PictureURL || itemDetails.PictureDetails?.PictureURL || "N/A",
    recent_sales: 0, // Placeholder for further processing
  }));
}

function initiateNextBatch(userIndex: number, itemIndex: number): NextResponse {
  const nextCursor = { userIndex, itemIndex };
  return NextResponse.json({
    cursor: nextCursor,
    message: `Batch completed. Total items processed: ${processedItemsCount}`,
  });
}
