import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Get user authentication details using Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "200", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Fetch out-of-stock items from `inventory`
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory")
      .select("id, title, price, total_sold, recent_sales, gallery_url, quantity_available")
      .eq("user_id", userId)
      .eq("quantity_available", 0);

    if (inventoryError) {
      console.error("Error fetching inventory data:", inventoryError);
      return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
    }

    // Fetch out-of-stock variations from `inventoryVariation`
    const { data: variationItems, error: variationError } = await supabase
      .from("inventoryVariation")
      .select("inventory_id, name, price, recent_sales, quantity_sold, quantity, picture_url")
      .eq("quantity", 0);

    if (variationError) {
      console.error("Error fetching inventory variations:", variationError);
      return NextResponse.json({ message: "Failed to fetch variation data" }, { status: 500 });
    }

    // Combine inventory and variation items
    const combinedData = [
      ...(inventoryItems || []).map((item) => ({
        type: "Inventory",
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity_available,
        totalSold: item.total_sold,
        recentSales: item.recent_sales,
        image: item.gallery_url,
      })),
      ...(variationItems || []).map((item) => ({
        type: "Variation",
        id: item.inventory_id,
        title: item.name,
        price: item.price,
        quantity: item.quantity,
        totalSold: item.quantity_sold,
        recentSales: item.recent_sales,
        image: item.picture_url,
      })),
    ];

    // Sort combined data by `recentSales` in descending order
    combinedData.sort((a, b) => b.recentSales - a.recentSales);

    // Paginate combined data
    const paginatedData = combinedData.slice((page - 1) * entriesPerPage, page * entriesPerPage);

    return NextResponse.json({
      data: paginatedData,
      totalPages: Math.ceil(combinedData.length / entriesPerPage),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching out-of-stock items:", error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}
