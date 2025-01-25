import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthorized } from "@/utils/data/user/isAuthorized";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      console.log("Unauthorized: No user ID found.");
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
    // If authorized, proceed to fetch data
    console.log("Authorized user. Proceeding to fetch data.");
    const { searchParams } = new URL(req.url);
    const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "200", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

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

    const batchSize = 1000;
    const allItems: any[] = [];
    let start = 0;

    while (start < totalItems) {
      const { data: batchData, error: batchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", userId)
        .range(start, Math.min(start + batchSize - 1, totalItems - 1));

      if (batchError) {
        console.error(`Error fetching batch starting at ${start}:`, batchError);
        return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
      }

      allItems.push(...(batchData || []));
      start += batchSize;
    }

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
