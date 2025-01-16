import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      return NextResponse.json({ error: "Authorization failed." }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code not found." },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI!;

    // Exchange code for tokens
    const response = await axios.post(
      "https://api.ebay.com/identity/v1/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
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

    const { access_token, refresh_token, expires_in } = response.data;

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    // Store tokens in the database
    await prisma.ebay_tokens.upsert({
      where: { user_id: user.id },
      update: {
        access_token,
        refresh_token,
        expires_at: expiresAt,
      },
      create: {
        user_id: user.id,
        access_token,
        refresh_token,
        expires_at: expiresAt,
      },
    });

    // Sequentially call APIs
    const apis = [
      { endpoint: "/api/fetch-items", name: "fetch-items" },
      { endpoint: "/api/fetch-sales", name: "fetch-sales" },
      { endpoint: "/api/fetch-variants", name: "fetch-variants" },
    ];

    for (const api of apis) {
      const apiResponse = await fetch(`${process.env.FRONTEND_URL}${api.endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!apiResponse.ok) {
        console.error(`Error calling ${api.name} API:`, await apiResponse.json());
        return NextResponse.json(
          { error: `Failed to call ${api.name} API` },
          { status: 500 }
        );
      }

      console.log(`${api.name} API called successfully.`);
    }

    // Redirect to the dashboard after API calls
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error: any) {
    console.error("Error in eBay callback API:", error.response?.data || error.message);
    return NextResponse.json({ error: "Failed to complete eBay callback." }, { status: 500 });
  }
}
