import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
console.log("SUPABASE", supabase);
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Get user authentication details using Clerk
    const { userId } = getAuth(req);
    console.log(userId);
    if (!userId) {
      console.log("Unauthorized user authentication");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "200", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    // Get the total count of items
    const { count: totalCount, error: countError } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("Error fetching total count:", countError);
      return NextResponse.json({ message: "Failed to fetch inventory count" }, { status: 500 });
    }

    const totalItems = totalCount || 0;

    if (totalItems === 0) {
      return NextResponse.json({ data: [], totalPages: 0, currentPage: page });
    }

    // Fetch all rows in batches if needed
    const batchSize = 1000; // Supabase's maximum batch size
    const allItems: any[] = [];
    let start = 0;

    while (start < totalItems) {
      const { data: batchData, error: batchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", userId)
        .range(start, Math.min(start + batchSize - 1, totalItems - 1));

      if (batchError) {
        console.error("Error fetching batch data:", batchError);
        return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
      }

      allItems.push(...(batchData || []));
      start += batchSize;
    }

    // Paginate the fetched data for the current page
    const paginatedData = allItems.slice((page - 1) * entriesPerPage, page * entriesPerPage);

    return NextResponse.json({
      data: paginatedData,
      totalPages: Math.ceil(totalItems / entriesPerPage),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
  }
}
