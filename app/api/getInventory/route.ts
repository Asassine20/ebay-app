import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const inventory = await prisma.inventory.findMany({
      select: {
        item_id: true,
      },
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error("An error occurred:", (error as Error).message);
  }
}
