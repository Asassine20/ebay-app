import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ebayTokenEndpoint = "https://api.ebay.com/identity/v1/oauth2/token";

async function refreshToken(userId: number) {
  try {
    // Fetch the eBay token from the database
    //console.log(`Fetching eBay token for userId: ${userId}`);
    const ebayToken = await prisma.ebay_tokens.findUnique({
      where: { user_id: userId },
    });

    //console.log("Retrieved eBay token record:", ebayToken);

    if (!ebayToken) {
      console.error(`No eBay token found for userId: ${userId}`);
      throw new Error("eBay token not found for user.");
    }

    const { refresh_token } = ebayToken;

    //console.log(`Refresh token for userId ${userId}:`, refresh_token ? refresh_token.substring(0, 5) + "..." : "None");

    if (!refresh_token) {
      console.error(`Refresh token not found for userId: ${userId}`);
      throw new Error("Refresh token missing for user.");
    }

    const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;

    //console.log("Client ID and Secret length check:");
    //console.log("Client ID:", clientId);
    //console.log("Client Secret length:", clientSecret.length); // Log length, not value, for security.

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh_token,
      scope: "https://api.ebay.com/oauth/api_scope", // Update if necessary
    });

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    };

    //console.log(`Refreshing token for userId: ${userId}`);
    //console.log("Request body:", body.toString());
    //console.log("Authorization header (encoded):", headers.Authorization);

    // Make the request to refresh the token
    const res = await fetch(ebayTokenEndpoint, { method: "POST", headers, body: body.toString() });
    const data = await res.json();

    //console.log("Response status:", res.status);
    //console.log("Response data:", data);

    if (!res.ok) {
      console.error("Failed to refresh eBay token:", data);
      throw new Error(`Failed to refresh token: ${data.error_description || "Unknown error"}`);
    }

    //console.log("Token refreshed successfully:", data);

    // Calculate the new expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

    // Update the token in the database
    //console.log(`Updating database with new access token for userId: ${userId}`);
    await prisma.ebay_tokens.update({
      where: { user_id: userId },
      data: {
        access_token: data.access_token,
        expires_at: expiresAt,
      },
    });

    //console.log("Database updated successfully.");
    return { access_token: data.access_token, expires_at: expiresAt };

  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error refreshing token for userId ${userId}:`, error.message);
    } else {
      console.error(`Error refreshing token for userId ${userId}:`, error);
    }
    throw error; // Re-throw the error to ensure proper error propagation
  }
}

export default refreshToken;
