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

    // Fetch inventory items for the user
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, title, price, quantity_available, total_sold, recent_sales, gallery_url, user_id")
      .eq("user_id", userId)
      .gt("recent_sales", 1) // Items with more than 1 recent sale
      .lt("quantity_available", 3) // Items with less than 3 available quantity
      .gt("quantity_available", 0); // Exclude items with quantity_available = 0

    if (inventoryError) {
      console.error("Error fetching inventory data:", inventoryError);
      return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
    }

    // Sort by recent_sales in descending order
    inventoryItems.sort((a, b) => b.recent_sales - a.recent_sales);

    // Paginate results
    const paginatedData = inventoryItems.slice((page - 1) * entriesPerPage, page * entriesPerPage);

    return NextResponse.json({
      data: paginatedData,
      totalPages: Math.ceil(inventoryItems.length / entriesPerPage),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching items that need attention:", error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}
