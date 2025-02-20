import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorized } from "@/utils/data/user/isAuthorized"; // Ensure correct import path for isAuthorized

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
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

    const { searchParams } = new URL(req.url);
    const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "200", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Fetch inventory items with recent_sales > 1
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, title, price, quantity_available, total_sold, recent_sales, gallery_url")
      .eq("user_id", userId)
      .gt("recent_sales", 1)
      .order("recent_sales", { ascending: false });

    if (inventoryError) {
      console.error("Error fetching inventory data:", inventoryError);
      return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
    }

    // Process only inventory items
    const combinedData = (inventoryItems || []).map((item) => ({
      type: "Inventory",
      id: item.id,
      title: item.title,
      price: item.price,
      quantity: item.quantity_available,
      totalSold: item.total_sold,
      recentSales: item.recent_sales,
      image: item.gallery_url,
    }));

    // Sort by recentSales
    combinedData.sort((a, b) => b.recentSales - a.recentSales);

    // Paginate results
    const paginatedData = combinedData.slice((page - 1) * entriesPerPage, page * entriesPerPage);

    return NextResponse.json({
      data: paginatedData,
      totalPages: Math.ceil(combinedData.length / entriesPerPage),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching top-selling items:", error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}
