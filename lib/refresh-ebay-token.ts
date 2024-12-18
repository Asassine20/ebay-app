import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ebayTokenEndpoint = "https://api.ebay.com/identity/v1/oauth2/token";

async function refreshToken(userId: number) {
  try {
    const ebayToken = await prisma.ebay_tokens.findUnique({
      where: { user_id: userId },
    });

    if (!ebayToken) {
      console.error(`No eBay token found for userId: ${userId}`);
      throw new Error("eBay token not found for user.");
    }

    const { refresh_token } = ebayToken;

    if (!refresh_token) {
      console.error(`Refresh token not found for userId: ${userId}`);
      throw new Error("Refresh token missing for user.");
    }

    const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
      scope: "https://api.ebay.com/oauth/api_scope", // Update if necessary
    });

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    };

    const res = await fetch(ebayTokenEndpoint, { method: "POST", headers, body: body.toString() });
    const data = await res.json();

    if (!res.ok) {
      console.error("Failed to refresh eBay token:", data);
      throw new Error(`Failed to refresh token: ${data.error_description || "Unknown error"}`);
    }

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    await prisma.ebay_tokens.update({
      where: { user_id: userId },
      data: {
        access_token: data.access_token,
        expires_at: expiresAt,
        refresh_token: data.refresh_token || refresh_token, // Update or keep the existing refresh_token
      },
    });

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refresh_token,
      expires_at: expiresAt,
    };
  } catch (error) {
    console.error(`Error refreshing token for userId ${userId}:`, error instanceof Error ? error.message : error);
    throw error;
  }
}


export default refreshToken;
