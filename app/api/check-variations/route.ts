import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { inventoryIds } = await req.json();

    if (!Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return NextResponse.json({ message: "No inventory IDs provided" }, { status: 400 });
    }

    const batchSize = 500; // Process 500 items at a time
    const variations: any[] = [];

    for (let i = 0; i < inventoryIds.length; i += batchSize) {
      const batch = inventoryIds.slice(i, i + batchSize);

      // Fetch variations for the batch
      const { data: batchData, error: batchError } = await supabase
        .from("inventoryVariation")
        .select("inventory_id")
        .in("inventory_id", batch);

      if (batchError) {
        console.error(`Error fetching variations for batch: ${batch}`, batchError);
        // Handle error for this batch gracefully, continue to next batch
        batch.forEach((inventoryId) => {
          variations.push({ inventoryId, has_variations: false });
        });
        continue;
      }

      // Aggregate variations for the batch
      const variationCounts: Record<number, boolean> = {};
      batchData?.forEach((item: { inventory_id: number }) => {
        variationCounts[item.inventory_id] = true;
      });

      // Map batch results to the response format
      batch.forEach((inventoryId) => {
        variations.push({
          inventoryId,
          has_variations: !!variationCounts[inventoryId], // True if variations exist
        });
      });
    }

    return NextResponse.json({ variations });
  } catch (error) {
    console.error("Error fetching variations:", error);
    return NextResponse.json({ message: "Failed to fetch variations" }, { status: 500 });
  }
}
