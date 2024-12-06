import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return new Response('Missing code', { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;
    const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI!;

    // Build Basic Auth header
    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

    const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    });

    // Request access token from eBay
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader,
      },
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Token Exchange Failed:', errorText);
      return new Response('Failed to exchange token', { status: 500 });
    }

    const tokenData = await tokenRes.json();

    // Optionally store the tokenData in a database or session
    console.log('Token Data:', tokenData);

    // Redirect to the dashboard with a success message or query param
    return NextResponse.redirect('/dashboard?status=success');
  } catch (error) {
    console.error('Callback Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
