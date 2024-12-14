import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { parseStringPromise } from "xml2js";
import refreshToken from "@/lib/refresh-ebay-token";

const prisma = new PrismaClient();
const ebayApiUrl = "https://api.ebay.com/ws/api.dll";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = req.headers.get("user-id");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  try {
    // Fetch user details
    const dbUser = await prisma.user.findUnique({ where: { id: parseInt(userId, 10) } });
    if (!dbUser) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    // Fetch eBay token
    let ebayToken = await prisma.ebay_tokens.findUnique({ where: { user_id: dbUser.id } });
    if (!ebayToken || !ebayToken.access_token || ebayToken.expires_at <= new Date()) {
      const refreshedToken = await refreshToken(dbUser.id);

      if (ebayToken) {
        // Update only the token fields in the existing object
        ebayToken = {
          ...ebayToken,
          access_token: refreshedToken.access_token,
          expires_at: refreshedToken.expires_at,
        };
      } else {
        ebayToken = {
          id: 0, // Assuming 0 for a placeholder if necessary; adjust as per your DB logic
          created_time: new Date(),
          updated_time: new Date(),
          user_id: dbUser.id,
          access_token: refreshedToken.access_token,
          refresh_token: "", // Replace with a proper value if needed
          expires_at: refreshedToken.expires_at,
        };
      }
    }

    // Call eBay API to fetch total entries
    const body = `<?xml version="1.0" encoding="utf-8"?>
    <GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
            <eBayAuthToken>${ebayToken.access_token}</eBayAuthToken>
        </RequesterCredentials>
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <ActiveList>
            <Sort>TimeLeft</Sort>
            <Pagination>
                <EntriesPerPage>1</EntriesPerPage>
                <PageNumber>1</PageNumber>
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

    if (!res.ok) {
      console.error(`Error fetching total entries: ${res.status}`);
      throw new Error(`Error fetching total entries: ${res.status}`);
    }

    const parsedData = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
    const totalEntries = parseInt(
      parsedData.GetMyeBaySellingResponse?.ActiveList?.PaginationResult?.TotalNumberOfEntries || "0",
      10
    );

    //console.log(`Total entries fetched: ${totalEntries}`);

    return NextResponse.json({ totalEntries });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error in GET handler:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      console.error("Unexpected error in GET handler:", error);
      return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
  }
}
