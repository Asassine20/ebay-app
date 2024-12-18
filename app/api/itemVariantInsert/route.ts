import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import refreshToken from "@/lib/refresh-ebay-token";
import { parseStringPromise } from "xml2js";

const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";

interface Variation {
  name: string;
  price: number;
  quantity: number;
  quantity_sold: number;
  picture_url: string;
}

interface RefreshedToken {
  access_token: string;
  expires_at: Date;
  refresh_token?: string; // Optional property
}

async function fetchItemVariations(accessToken: string, itemId: string): Promise<Variation[]> {
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
  
      if (!itemDetails) {
        console.error(`Parsed item details are undefined for ItemID: ${itemId}`);
        console.error(`Raw Response Body: ${xml}`);
        return [];
      }
  
      if (!itemDetails.Variations?.Variation) {
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
        const quantity = parseInt(variation.Quantity || "0", 10); // Direct Quantity from API
        const quantitySold = parseInt(variation.SellingStatus?.QuantitySold || "0", 10);
  
        // Match picture for this variation, if available
        const picture = pictures.find(
          (pic: any) =>
            pic.VariationSpecificValue === nameValueList.find((specific: any) => specific.Name)?.Value
        );
  
        return {
          name,
          price,
          quantity,
          quantity_sold: quantitySold,
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
  

  export async function POST() {
    try {
      const allUsers = await prisma.user.findMany();
      if (allUsers.length === 0) {
        console.log("No users found in the database.");
        return NextResponse.json({ message: "No users found" });
      }
  
      for (const dbUser of allUsers) {
        console.log(`Processing user: ${dbUser.id}`);
  
        let ebayToken = await prisma.ebay_tokens.findUnique({ where: { user_id: dbUser.id } });
  
        if (!ebayToken || !ebayToken.access_token || ebayToken.expires_at <= new Date()) {
          console.log(`Refreshing token for user: ${dbUser.id}`);
          const refreshedToken: RefreshedToken = await refreshToken(dbUser.id);
  
          if (!refreshedToken || !refreshedToken.access_token) {
            console.warn(`Failed to refresh token for user ${dbUser.id}, skipping.`);
            continue;
          }
  
          ebayToken = await prisma.ebay_tokens.upsert({
            where: { user_id: dbUser.id },
            update: {
              access_token: refreshedToken.access_token,
              expires_at: refreshedToken.expires_at,
              updated_time: new Date(),
              refresh_token: refreshedToken.refresh_token || "",
            },
            create: {
              user_id: dbUser.id,
              access_token: refreshedToken.access_token,
              refresh_token: refreshedToken.refresh_token || "",
              expires_at: refreshedToken.expires_at,
              created_time: new Date(),
              updated_time: new Date(),
            },
          });
        }
  
        const inventoryItems = await prisma.inventory.findMany({
          where: { user_id: dbUser.user_id },
        });
  
        for (const inventoryItem of inventoryItems) {
          console.log(`Fetching variations for ItemID: ${inventoryItem.item_id}`);
  
          let variations: Variation[];
          try {
            variations = await fetchItemVariations(ebayToken.access_token, inventoryItem.item_id);
  
            if (!variations || variations.length === 0) {
              console.log(`No variations found for ItemID: ${inventoryItem.item_id}`);
              continue;
            }
          } catch (fetchError) {
            console.error(`Error fetching variations for ItemID: ${inventoryItem.item_id}`, fetchError);
            continue; // Skip this item and continue with the next
          }
  
          const validVariations = variations.filter((variation) => {
            if (!variation.name || !variation.price || !variation.quantity) {
              console.warn(`Invalid variation data for ItemID: ${inventoryItem.item_id}`, variation);
              return false; // Skip invalid variations
            }
            return true;
          });
  
          try {
            await prisma.$transaction(
              validVariations.map((variation: Variation) =>
                prisma.inventoryVariation.upsert({
                  where: {
                    inventory_id_name: {
                      inventory_id: inventoryItem.id,
                      name: variation.name,
                    },
                  },
                  update: {
                    price: variation.price,
                    quantity: variation.quantity,
                    quantity_sold: variation.quantity_sold,
                    picture_url: Array.isArray(variation.picture_url) ? variation.picture_url[0] : variation.picture_url, // Use the first URL
                  },
                  create: {
                    inventory_id: inventoryItem.id,
                    name: variation.name,
                    price: variation.price,
                    quantity: variation.quantity,
                    quantity_sold: variation.quantity_sold,
                    picture_url: Array.isArray(variation.picture_url) ? variation.picture_url[0] : variation.picture_url, // Use the first URL
                  },
                })
              )
            );
            console.log(`Successfully upserted variations for ItemID: ${inventoryItem.item_id}`);
          } catch (upsertError) {
            console.error(`Error during upsert for ItemID: ${inventoryItem.item_id}`, upsertError);
            // Skip this item and continue
          }
        }
  
        console.log(`Finished processing variations for user: ${dbUser.id}`);
      }
  
      return NextResponse.json({ message: "Variations inserted successfully for all users" });
    } catch (error) {
      console.error("Error processing variations:", error);
      return NextResponse.json({ error: "Failed to insert variations" }, { status: 500 });
    }
  }
  