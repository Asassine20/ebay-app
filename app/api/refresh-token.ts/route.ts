import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(request: Request) {
  try {
    const nextRequest = new NextRequest(request);
    const { userId: clerkUserId } = getAuth(nextRequest);

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "User is not authenticated." },
        { status: 401 }
      );
    }

    // Retrieve the database user ID using Clerk's user_id
    const user = await prisma.user.findUnique({
      where: { user_id: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found in the database." },
        { status: 404 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;

    // Retrieve the refresh token from the database
    const tokenData = await prisma.ebay_tokens.findUnique({
      where: { user_id: user.id },
    });

    if (!tokenData?.refresh_token) {
      return NextResponse.json({ error: "Refresh token not found." }, { status: 400 });
    }

    // Exchange the refresh token for a new access token
    const response = await axios.post(
      "https://api.ebay.com/identity/v1/oauth2/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenData.refresh_token,
        scope: "https://api.ebay.com/oauth/api_scope", // Ensure proper scope
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString(
            "base64"
          )}`,
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // Update the database
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    await prisma.ebay_tokens.update({
      where: { user_id: user.id },
      data: {
        access_token,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({ message: "Access token refreshed successfully." });
  } catch (error: any) {
    console.error("Error refreshing token:", error.response?.data || error.message);
    return NextResponse.json({ error: "Failed to refresh token." }, { status: 500 });
  }
}
