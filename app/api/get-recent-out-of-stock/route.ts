import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { count, error } = await supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quantity_available", 0)
      .gt("recent_sales", 1);

    if (error) {
      console.error("Error fetching inventory data:", error);
      return NextResponse.json({ message: "Failed to fetch inventory data" }, { status: 500 });
    }

    return NextResponse.json({ total: count || 0 });
  } catch (error) {
    console.error("Error fetching recent out-of-stock data:", error);
    return NextResponse.json({ message: "Failed to fetch data" }, { status: 500 });
  }
}
