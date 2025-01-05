import { NextRequest, NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";
import { createClient } from "@supabase/supabase-js";
import refreshToken from "@/lib/refresh-ebay-token";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";
const ITEMS_PER_BATCH = 200;
const MAX_CONCURRENT_REQUESTS = 5; // Adjust based on API rate limits

interface RefreshedToken {
  access_token: string;
  expires_at: Date;
  refresh_token?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const cursor = JSON.parse(req.headers.get("cursor") || "{}");
  const { userIndex = 0 } = cursor;

  try {
    const { data: allUsers, error: userError } = await supabase.from("user").select("id, user_id");
    if (userError || !allUsers || allUsers.length === 0) {
      return NextResponse.json({ error: "Failed to fetch users or no users found" }, { status: 500 });
    }

    const usersToProcess = allUsers.slice(userIndex, userIndex + MAX_CONCURRENT_REQUESTS);

    if (usersToProcess.length === 0) {
      return NextResponse.json({ message: "All users processed successfully" });
    }

    await Promise.all(
      usersToProcess.map(async (dbUser) => {
        let { data: ebayToken, error: tokenError } = await supabase
          .from("ebay_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", dbUser.id)
          .single();

        if (!ebayToken || tokenError || new Date(ebayToken.expires_at) <= new Date()) {
          const refreshedToken = (await refreshToken(dbUser.id)) as RefreshedToken;
          if (!refreshedToken || !refreshedToken.access_token) {
            console.warn(`Skipping user ${dbUser.id}: Unable to refresh token`);
            return;
          }
          await supabase.from("ebay_tokens").upsert({
            user_id: dbUser.id,
            access_token: refreshedToken.access_token,
            refresh_token: refreshedToken.refresh_token || ebayToken?.refresh_token || "",
            expires_at: refreshedToken.expires_at,
          });
          ebayToken = {
            access_token: refreshedToken.access_token,
            refresh_token: refreshedToken.refresh_token || "", // Ensure fallback here too
            expires_at: refreshedToken.expires_at,
          };        }

        const { totalPages } = await fetchItemsForUser(ebayToken!.access_token, dbUser, 1);
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

        await Promise.all(
          pageNumbers.map((pageNumber) =>
            fetchItemsForUser(ebayToken!.access_token, dbUser, pageNumber)
          )
        );
      })
    );

    const nextCursor = { userIndex: userIndex + MAX_CONCURRENT_REQUESTS };
    return NextResponse.json({ cursor: nextCursor, message: "Batch processed successfully" });
  } catch (error) {
    console.error("Error in processing:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

async function fetchItemsForUser(
  accessToken: string,
  dbUser: any,
  pageNumber: number
): Promise<{ totalPages: number }> {
  const body = `<?xml version="1.0" encoding="utf-8"?>
    <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
            <eBayAuthToken>${accessToken}</eBayAuthToken>
        </RequesterCredentials>
        <ActiveList>
            <Pagination>
                <EntriesPerPage>${ITEMS_PER_BATCH}</EntriesPerPage>
                <PageNumber>${pageNumber}</PageNumber>
            </Pagination>
        </ActiveList>
    </GetMyeBaySellingRequest>`;

  const headers: HeadersInit = {
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
    "Content-Type": "text/xml",
  };

  const res = await fetch(ebayApiUrl, { method: "POST", headers, body });
  const xml = await res.text();
  if (!res.ok) throw new Error(`Error fetching eBay items for user ${dbUser.id}: ${res.status}`);

  const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
  const items = parsedData.GetMyeBaySellingResponse?.ActiveList?.ItemArray?.Item || [];
  const totalPages = parseInt(
    parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfPages || "1",
    10
  );

  if (items.length > 0) {
    const upsertData = items.map((item: any) => ({
      item_id: item.ItemID,
      title: item.Title || "Unknown Item",
      price:
        typeof item.SellingStatus?.CurrentPrice === "object"
          ? parseFloat(item.SellingStatus?.CurrentPrice._ || "0.0")
          : parseFloat(item.SellingStatus?.CurrentPrice || "0.0"),
      quantity_available: parseInt(item.QuantityAvailable || item.Quantity || "0", 10),
      gallery_url: item.PictureDetails?.GalleryURL || "N/A",
      user_id: dbUser.user_id,
      last_fetched_time: new Date(),
    }));

    const { error: upsertError } = await supabase.from("inventory").upsert(upsertData);
    if (upsertError) {
      console.error(`Upsert Error for user ${dbUser.id}, page ${pageNumber}:`, upsertError);
    } else {
      console.log(`Upserted ${upsertData.length} items for user ${dbUser.id}, page ${pageNumber}`);
    }
  }

  return { totalPages };
}
