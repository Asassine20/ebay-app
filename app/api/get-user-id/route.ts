import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function GET(req: NextRequest) {
  try {
    // Fetch the userId from Clerk
    const { userId: clerkUserId } = getAuth(req);

    if (!clerkUserId) {
      console.error("Failed to retrieve userId from Clerk.");
      return NextResponse.json(
        { error: "User is not authenticated." },
        { status: 401 }
      );
    }

    // Query the Supabase database to find the corresponding user
    const { data: user, error: userError } = await supabase
      .from("user")
      .select("id")
      .eq("user_id", clerkUserId)
      .single();

    if (userError) {
      console.error("Error fetching user from Supabase:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user from the database." },
        { status: 500 }
      );
    }

    if (!user) {
      console.error("No user found in the database for user_id:", clerkUserId);
      return NextResponse.json(
        { error: "User not found in the database." },
        { status: 404 }
      );
    }

    // Return the database ID of the user
    return NextResponse.json({ id: user.id });
  } catch (error) {
    console.error("Error fetching user ID from the database:", error);

    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
