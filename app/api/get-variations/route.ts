import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
      const { searchParams } = new URL(req.url);
      const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "10", 10);
      const page = parseInt(searchParams.get("page") || "1", 10);
      const itemId = searchParams.get("itemId");
  
      if (!itemId) {
        return NextResponse.json({ message: "Missing itemId parameter" }, { status: 400 });
      }
  
      console.log("Fetching variations for itemId:", itemId);
  
      let inventoryId: number | null = null;
      let itemName: string | null = null;
  
      // Step 1: Fetch inventory.id and item_name using itemId
      const { data: inventoryItem, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, title") // Fetch item name (title)
        .eq("item_id", itemId)
        .single();
  
      if (inventoryError || !inventoryItem) {
        console.warn("Item ID not found in inventory table, treating as inventory_id:", itemId);
        inventoryId = parseInt(itemId, 10);
      } else {
        inventoryId = inventoryItem.id;
        itemName = inventoryItem.title; // Assign the item name
      }
  
      if (!inventoryId) {
        return NextResponse.json({ message: "Invalid itemId or inventoryId" }, { status: 400 });
      }
  
      // Step 2: Fetch variations for the inventory ID
      const { data: variations, error: variationsError } = await supabase
        .from("inventoryVariation")
        .select("*")
        .eq("inventory_id", inventoryId)
        .range((page - 1) * entriesPerPage, page * entriesPerPage - 1);
  
      if (variationsError) {
        console.error("Error fetching variations:", variationsError);
        return NextResponse.json({ message: "Failed to fetch variations" }, { status: 500 });
      }
  
      // Step 3: Get total count of variations for pagination
      const { count: totalCount, error: countError } = await supabase
        .from("inventoryVariation")
        .select("*", { count: "exact", head: true })
        .eq("inventory_id", inventoryId);
  
      if (countError) {
        console.error("Error fetching total count:", countError);
        return NextResponse.json({ message: "Failed to fetch total count" }, { status: 500 });
      }
  
      return NextResponse.json({
        itemName, // Include itemName in the response
        data: variations || [],
        totalPages: Math.ceil((totalCount || 0) / entriesPerPage),
        currentPage: page,
      });
    } catch (error) {
      console.error("Error in get-variations API:", error);
      return NextResponse.json({ message: "Failed to fetch variations" }, { status: 500 });
    }
  }
  