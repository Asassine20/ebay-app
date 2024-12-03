import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";

const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const authToken = process.env.AUTH_TOKEN;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") || "1";
  const entriesPerPage = searchParams.get("entriesPerPage") || "200";

  if (!authToken) {
    console.error("Missing eBay auth token");
    return NextResponse.json({ error: "Missing eBay auth token" }, { status: 400 });
  }

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

  try {
    const res = await fetch(ebayApiUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      console.error(`eBay API returned status: ${res.status}`);
      return NextResponse.json(
        { error: `eBay API returned status ${res.status}` },
        { status: res.status }
      );
    }

    const xml = await res.text();

    // Parse XML response into JSON using xml2js
    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const activeList = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item;

    if (!activeList || activeList.length === 0) {
      return NextResponse.json([]);
    }

    const items = Array.isArray(activeList) ? activeList : [activeList];
    const parsedItems = items.map((item: any) => {
      const itemId = item.ItemID || "N/A";
      const title = item.Title || "N/A";
      const price =
        item.SellingStatus?.CurrentPrice?._ ||
        item.SellingStatus?.CurrentPrice ||
        "0.0"; // Handle nested structure or fallback
      const quantity = item.QuantityAvailable || "0";

      const variations = (item.Variations?.Variation || []).map((variation: any) => {
        const nameValueList = variation.VariationSpecifics?.NameValueList;
        const specifics = Array.isArray(nameValueList)
          ? nameValueList.map((specific: any) => ({
              Name: specific.Name || "Unknown",
              Value: specific.Value || "Unknown",
            }))
          : nameValueList
          ? [
              {
                Name: nameValueList.Name || "Unknown",
                Value: nameValueList.Value || "Unknown",
              },
            ]
          : [];

        return {
          Price: variation.StartPrice?._ || variation.StartPrice || "0.0",
          Quantity: variation.Quantity || "0",
          Specifics: specifics,
        };
      });

      return {
        ItemID: itemId,
        Title: title,
        Price: price,
        Quantity: quantity,
        Variations: variations,
      };
    });

    return NextResponse.json(parsedItems);
  } catch (error: any) {
    console.error("Error in GET /api/ebay-listings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
