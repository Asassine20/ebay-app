import { NextRequest, NextResponse } from 'next/server';
import { encode } from 'base-64';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME as string;
  const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET as string;
  const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI as string;

  const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
  const authHeader = 'Basic ' + encode(`${clientId}:${clientSecret}`);

  const bodyParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri
  });

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: authHeader
    },
    body: bodyParams
  });

  if (!tokenRes.ok) {
    return new Response('Failed to exchange token', { status: 500 });
  }

  const tokenData = await tokenRes.json();
  // tokenData will contain access_token, refresh_token, and expires_in
  // Here you should store these tokens in your database for the logged-in user.
  // Example (pseudo-code):
  // await db.userTokens.upsert({ userId, ebayAccessToken: tokenData.access_token, ebayRefreshToken: tokenData.refresh_token });

  return NextResponse.redirect('/dashboard');
}
