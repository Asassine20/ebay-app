// Checks to see if the user is already connected to ebay or not
import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const userId = req.headers.get("user-id");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  try {
    const ebayToken = await prisma.ebay_tokens.findUnique({
      where: { user_id: parseInt(userId, 10) },
    });

    return NextResponse.json({ hasToken: !!ebayToken }); // Return true if token exists, otherwise false
  } catch (error) {
    console.error("Error checking eBay token:", error);
    return NextResponse.json({ error: "Failed to check eBay token" }, { status: 500 });
  }
}
