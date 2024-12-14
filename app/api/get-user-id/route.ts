import { NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Import your Prisma instance

export async function GET(request: Request) {
  try {
    const nextRequest = new NextRequest(request);
    const { userId } = getAuth(nextRequest); // Clerk's userId

    if (!userId) {
      return NextResponse.json(
        { error: "User is not authenticated." },
        { status: 401 }
      );
    }

    // Query the database to find the corresponding row
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in the database." },
        { status: 404 }
      );
    }

    // Return the database ID
    return NextResponse.json({ id: user.id });
  } catch (error) {
    console.error("Error fetching user ID from the database:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
