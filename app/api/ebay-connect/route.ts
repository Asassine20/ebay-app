import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const ebayOAuthUrl = process.env.NEXT_PUBLIC_EBAY_OAUTH_URL!;
    const clientName = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI!;

    // Define the scopes your application needs
    const scope = [
      'https://api.ebay.com/oauth/api_scope',
      'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.finances',
      'https://api.ebay.com/oauth/api_scope/sell.payment.dispute',
      'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.reputation',
      'https://api.ebay.com/oauth/api_scope/sell.reputation.readonly',
      'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription',
      'https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.stores',
      'https://api.ebay.com/oauth/api_scope/sell.stores.readonly',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientName,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
    });

    const url = `${ebayOAuthUrl}?${params.toString()}`;
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('eBay Connect Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
