import { NextResponse } from 'next/server';

export async function GET() {
  const ebayOAuthUrl = process.env.NEXT_PUBLIC_EBAY_OAUTH_URL as string;
  const clientName = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME as string;
  const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI as string;

  const params = new URLSearchParams({
    client_id: clientName,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory'
  });

  const url = `${ebayOAuthUrl}?${params.toString()}`;
  return NextResponse.redirect(url);
}
