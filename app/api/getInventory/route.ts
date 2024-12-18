import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Get user authentication details using Clerk
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const entriesPerPage = parseInt(searchParams.get("entriesPerPage") || "200", 10);

    // Fetch inventory data for the user with pagination
    const inventoryData = await prisma.inventory.findMany({
      where: { user_id: userId },
      skip: (page - 1) * entriesPerPage,
      take: entriesPerPage,
    });

    // Total items count for pagination
    const totalCount = await prisma.inventory.count({ where: { user_id: userId } });

    return NextResponse.json({
      data: inventoryData,
      totalPages: Math.ceil(totalCount / entriesPerPage),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { message: "Failed to fetch inventory data" },
      { status: 500 }
    );
  }
}
