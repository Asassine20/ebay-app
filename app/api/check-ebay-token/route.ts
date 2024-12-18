import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = req.headers.get("user-id");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  try {
    // Query the eBay tokens table to check if a token exists for the user
    const { data: ebayToken, error: tokenError } = await supabase
      .from("ebay_tokens")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (tokenError) {
      console.error("Error fetching eBay token from Supabase:", tokenError);
      return NextResponse.json({ error: "Failed to check eBay token" }, { status: 500 });
    }

    return NextResponse.json({ hasToken: !!ebayToken }); // Return true if token exists, otherwise false
  } catch (error) {
    console.error("Error in GET handler:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
