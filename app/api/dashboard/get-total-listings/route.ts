import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userId = req.headers.get("user-id");

  if (!userId) {
    console.error("Missing userId parameter in request headers.");
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  console.log("Received request to fetch total rows for user.id:", userId);

  try {
    // Step 1: Fetch the user.user_id using the provided user.id
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("user_id")
      .eq("id", parseInt(userId, 10))
      .single();

    if (userError || !user) {
      console.error("Error fetching user_id from Supabase:", userError || "No user found");
      return NextResponse.json({ error: "Failed to fetch user_id from the database." }, { status: 400 });
    }

    console.log("Fetched user.user_id:", user.user_id);

    // Step 2: Fetch the total number of rows in inventory for the fetched user.user_id
    const { count, error: countError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.user_id);

    if (countError) {
      console.error("Error fetching total rows from Supabase:", countError);
      return NextResponse.json({ error: "Failed to fetch total rows from the database." }, { status: 500 });
    }

    console.log(`Total rows for inventory.user_id ${user.user_id}:`, count);

    return NextResponse.json({ totalEntries: count || 0 });
  } catch (error) {
    console.error("Error in GET handler:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
