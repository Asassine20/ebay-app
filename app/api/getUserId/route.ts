import { useAuth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = useAuth();

    if (!userId) {
      return NextResponse.json({ error: "User is not authenticated" }, { status: 401 });
    }

    return NextResponse.json({ userId });
  } catch (error: any) {
    console.error("Error fetching user ID:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
