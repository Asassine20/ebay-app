import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

    console.log("Clerk userId retrieved:", clerkUserId);

    // Query the database to find the corresponding user
    const user = await prisma.user.findUnique({
      where: { user_id: clerkUserId },
    });

    console.log("Prisma query input user_id:", clerkUserId);
    console.log("Prisma query result:", user);

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
