import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
  const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;
  const redirectUri = process.env.NEXT_PUBLIC_EBAY_REDIRECT_URI!;

  // Build Basic Auth header
  const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenUrl = 'https://api.ebay.com/identity/v1/oauth2/token';
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
    console.error(await tokenRes.text());
    return new Response('Failed to exchange token', { status: 500 });
  }

  const tokenData = await tokenRes.json();
  // tokenData contains access_token, refresh_token, expires_in, etc.

  // Store tokens in your database
  // You have a `user` table and a `tokens` table from previous steps:
  // Assuming you have a `tokens` model like:
  // model tokens {
  //   id               Int @id @default(autoincrement())
  //   created_time     DateTime @default(now())
  //   access_token     String?
  //   refresh_token    String?
  //   expires_in       Int?
  //   userId           Int
  //   user user @relation(fields: [userId], references: [id], onDelete: Cascade)
  // }

  // You’d likely have the current user’s ID in session. Since we’re in an API route,
  // we need a session or token-based auth logic. For simplicity, assume you have the user’s ID:
  const userId = 1; // Replace with logic to get the logged-in user’s ID

  // Connect to Prisma and store the tokens:
  // (Ensure you have `import { prisma } from '@/lib/prisma';` or similar)
  // await prisma.tokens.upsert({
  //   where: { userId },
  //   update: {
  //     access_token: tokenData.access_token,
  //     refresh_token: tokenData.refresh_token,
  //     expires_in: tokenData.expires_in
  //   },
  //   create: {
  //     userId,
  //     access_token: tokenData.access_token,
  //     refresh_token: tokenData.refresh_token,
  //     expires_in: tokenData.expires_in
  //   }
  // });

  // Redirect the user back to the dashboard
  return NextResponse.redirect('/dashboard');
}
