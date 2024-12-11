import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

// Helper function to fetch item details with variations
async function fetchItemDetails(itemId: string) {
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
      throw new Error(`eBay GetItem API returned status ${res.status}`);
    }

    const xml = await res.text();
    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const item = parsedData.GetItemResponse?.Item;

    if (!item) {
      throw new Error("Item not found in GetItem response.");
    }

    return item;
  } catch (error) {
    console.error(`Error fetching item details for ItemID ${itemId}:`, error);
    throw error;
  }
}

// Helper function to process variations
async function processVariations(item: any, inventoryId: number) {
    const variations = item.Variations?.Variation || [];
    const pictures = item.Variations?.Pictures?.VariationSpecificPictureSet || [];
  
    console.log(`Processing variations for item: ${item.ItemID}`);
    console.log(`Total variations found: ${variations.length}`);
  
    for (const variation of variations) {
      try {
        console.log("Raw Variation Data:", JSON.stringify(variation, null, 2));
  
        const nameValueList = variation.VariationSpecifics?.NameValueList || [];
        if (!nameValueList) {
          console.warn("Skipping variation due to missing specifics:", variation);
          continue;
        }
  
        const variationName = Array.isArray(nameValueList)
          ? nameValueList.map((specific: any) => `${specific.Name}: ${specific.Value}`).join(", ")
          : `${nameValueList.Name}: ${nameValueList.Value}`;
  
        const variationPrice = parseFloat(
          variation.StartPrice?._ || variation.StartPrice || "0.0"
        );
        const variationQuantity = parseInt(variation.Quantity || "0", 10);
        const variationQuantitySold = parseInt(
          variation.SellingStatus?.QuantitySold || "0",
          10
        );
  
        const variationValue = Array.isArray(nameValueList)
          ? nameValueList.find((specific: any) => specific.Name === "Choose Your Card")?.Value
          : nameValueList.Value;
  
        const picture = pictures.find((pic: any) => pic.VariationSpecificValue === variationValue);
  
        const upsertPayload = {
          where: {
            inventory_id_name: {
              inventory_id: inventoryId,
              name: variationName,
            },
          },
          update: {
            price: variationPrice,
            quantity: variationQuantity,
            quantity_sold: variationQuantitySold,
            picture_url: picture?.PictureURL || item.PictureDetails?.GalleryURL || null,
          },
          create: {
            inventory_id: inventoryId,
            name: variationName,
            price: variationPrice,
            quantity: variationQuantity,
            quantity_sold: variationQuantitySold,
            picture_url: picture?.PictureURL || item.PictureDetails?.GalleryURL || null,
          },
        };
  
        // Log the payload being sent to Prisma
        console.log("Upsert Payload:", JSON.stringify(upsertPayload, null, 2));
  
        // Validate critical fields
        if (!inventoryId || !variationName) {
          throw new Error(
            `Invalid payload data: inventoryId=${inventoryId}, variationName=${variationName}`
          );
        }
  
        // Ensure numeric fields are valid
        if (isNaN(variationPrice) || isNaN(variationQuantity) || isNaN(variationQuantitySold)) {
          throw new Error(
            `Invalid number fields in payload: price=${variationPrice}, quantity=${variationQuantity}, quantitySold=${variationQuantitySold}`
          );
        }
  
        // Perform upsert operation
        await prisma.inventoryVariation.upsert(upsertPayload);
  
        console.log(`Successfully processed variation: ${variationName}`);
      } catch (error) {
        console.error("Error processing variation. Skipping...", error);
      }
    }
  }
  

// Main API function
export async function GET() {
  try {
    const maxItems = 5000; // Maximum items to fetch
    const entriesPerPage = 200; // Items per page
    let page = 1; // Start with the first page
    let totalFetchedItems = 0;

    while (totalFetchedItems < maxItems) {
      const body = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>${authToken}</eBayAuthToken>
    </RequesterCredentials>
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

      const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
      if (!res.ok) {
        throw new Error(`eBay GetMyeBaySelling API returned status ${res.status}`);
      }

      const xml = await res.text();
      const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
      const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];

      const items = Array.isArray(activeList) ? activeList : [activeList];

      if (items.length === 0) {
        console.log("No more items to fetch.");
        break; // Exit loop if no items found
      }

      for (const item of items) {
        try {
          const itemId = item.ItemID || "N/A";
          const title = item.Title || "N/A";
          const price = parseFloat(
            item.SellingStatus?.CurrentPrice?._ || item.SellingStatus?.CurrentPrice || "0.0"
          );
          const totalSold = parseInt(item.SellingStatus?.QuantitySold || "0", 10);
          const quantityAvailable = parseInt(item.QuantityAvailable || "0", 10);
          const galleryUrl = item.PictureDetails?.GalleryURL || null;

          // Fetch full item details with variations
          const fullItemDetails = await fetchItemDetails(itemId);

          // Check if item already exists
          const existingItem = await prisma.inventory.findUnique({
            where: { item_id: itemId },
          });

          let inventoryId: number;

          if (existingItem) {
            // Update only relevant fields
            const updatedItem = await prisma.inventory.update({
              where: { item_id: itemId },
              data: {
                quantity_available: quantityAvailable,
                total_sold: totalSold,
              },
            });
            inventoryId = updatedItem.id;
            console.log(`Updated existing item: ${itemId}`);
          } else {
            // Save new item
            const newItem = await prisma.inventory.create({
              data: {
                item_id: itemId,
                created_time: new Date(),
                last_fetched_time: new Date(),
                title,
                price,
                quantity_available: quantityAvailable,
                total_sold: totalSold,
                gallery_url: galleryUrl,
                user_id: 'test_user_123',
              },
            });
            inventoryId = newItem.id;
            console.log(`Saved new item: ${itemId}`);
          }

          // Process variations
          if (fullItemDetails.Variations) {
            await processVariations(fullItemDetails, inventoryId);
          }
        } catch (itemError) {
          console.error("Error processing item. Skipping...", itemError);
        }
      }

      totalFetchedItems += items.length;
      page++; // Move to the next page
    }

    return NextResponse.json({ message: "Inventory updated successfully" });
  } catch (error: any) {
    console.error("Error in saveInventory API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
