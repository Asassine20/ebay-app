import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorized } from "@/utils/data/user/isAuthorized"; // Ensure correct import path

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Get user authentication details using Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

/*
    const { authorized, message } = await isAuthorized(userId);
    console.log("Authorization result:", { userId, authorized, message });

    if (!authorized) {
      console.log("Blocking unauthorized user:", userId);
      return NextResponse.json({ message }, { status: 403 });
    }
*/

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "200", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Fetch list of inventory items where quantity_available = 0 and recent_sales > 1
    const { data: inventoryItems, error } = await supabase
      .from("inventory")
      .select("id, title, price, recent_sales, total_sold, gallery_url, user_id")
      .eq("user_id", userId) // Match user_id
      .eq("quantity_available", 0) // Items with zero quantity
      .gt("recent_sales", 1) // Items with more than 1 recent sale
      .order("recent_sales", { ascending: false }) // Order by recent sales
      .range((page - 1) * entriesPerPage, page * entriesPerPage - 1); // Pagination

    if (error) {
      console.error("Error fetching inventory data:", error);
      return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
    }

    // Calculate total pages
    const { count, error: countError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quantity_available", 0)
      .gt("recent_sales", 1);

    if (countError) {
      console.error("Error fetching total count:", countError);
      return NextResponse.json({ message: "Failed to fetch total count" }, { status: 500 });
    }

    return NextResponse.json({
      data: inventoryItems || [],
      totalPages: Math.ceil((count || 0) / entriesPerPage),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}
