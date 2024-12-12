import { NextResponse } from 'next/server';

export async function GET() {
  const ebayOAuthUrl = process.env.NEXT_PUBLIC_EBAY_OAUTH_URL!;
  const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
  const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI!;
  const scope = 'https://api.ebay.com/oauth/api_scope'; // Add scopes as needed

  const authUrl = `${ebayOAuthUrl}&client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}`;
  return NextResponse.redirect(authUrl);
}
