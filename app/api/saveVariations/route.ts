import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId parameter" }, { status: 400 });
  }

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
    // Fetch item details from eBay API
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

    // Find corresponding inventory item
    const inventory = await prisma.inventory.findUnique({
      where: { item_id: itemId },
    });

    if (!inventory) {
      throw new Error(`Inventory not found for itemId ${itemId}`);
    }

    // Process variations
    const variations = itemDetails.Variations?.Variation || [];
    if (!variations.length) {
      console.warn(`No variations found for ItemID ${itemId}`);
      return NextResponse.json({ message: `No variations found for ItemID ${itemId}` });
    }

    for (const variation of variations) {
      try {
        const nameValueList = variation.VariationSpecifics?.NameValueList || {};
        const name = Array.isArray(nameValueList)
          ? nameValueList.map((specific: any) => `${specific.Name}: ${specific.Value}`).join(", ")
          : `${nameValueList.Name}: ${nameValueList.Value}`;

        const price = parseFloat(variation.StartPrice?._ || variation.StartPrice || "0.0");
        const quantity = parseInt(variation.Quantity || "0", 10);
        const quantitySold = parseInt(variation.SellingStatus?.QuantitySold || "0", 10);
        const pictureUrl = itemDetails.PictureDetails?.PictureURL || null;

        console.log(`Upserting variation for ItemID ${itemId}:`, {
          name,
          price,
          quantity,
          quantitySold,
          pictureUrl,
        });

        // Perform upsert for variations
        await prisma.inventoryVariation.upsert({
          where: {
            inventory_id_name: {
              inventory_id: inventory.id,
              name,
            },
          },
          update: {
            price,
            quantity,
            quantity_sold: quantitySold,
            picture_url: pictureUrl,
          },
          create: {
            inventory_id: inventory.id,
            name,
            price,
            quantity,
            quantity_sold: quantitySold,
            picture_url: pictureUrl,
          },
        });
      } catch (variationError) {
        console.error("Error processing variation. Skipping...", variationError);
      }
    }

    return NextResponse.json({ message: "Variations updated successfully" });
  } catch (error: any) {
    console.error("Error in saveVariations API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
