import { NextResponse } from 'next/server';
import axios from 'axios';
import {prisma} from '@/lib/prisma'; // Adjust the import path as necessary

export async function POST() {
  try {
    const clientId = process.env.NEXT_PUBLIC_EBAY_CLIENT_NAME!;
    const clientSecret = process.env.NEXT_PUBLIC_EBAY_CLIENT_SECRET!;
    
    // Retrieve the refresh token from the database
    const userId = 'test'; // Replace with authenticated user's ID
    const tokenData = await prisma.ebay_tokens.findUnique({ where: { user_id: userId } });

    if (!tokenData?.refresh_token) {
      return NextResponse.json({ error: 'Refresh token not found.' }, { status: 400 });
    }

    const response = await axios.post(
      'https://api.ebay.com/identity/v1/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        scope: 'https://api.ebay.com/oauth/api_scope', // Ensure proper scope
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      }
    );

    const { access_token, expires_in } = response.data;

    // Update the database
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    await prisma.ebay_tokens.update({
      where: { user_id: userId },
      data: {
        access_token,
        expires_at: expiresAt,
      },
    });

    return NextResponse.json({ message: 'Access token refreshed successfully.' });
  } catch (error: any) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    return NextResponse.json({ error: 'Failed to refresh token.' }, { status: 500 });
  }
}
