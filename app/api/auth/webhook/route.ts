import { userCreate } from "@/utils/data/user/userCreate";
import { userUpdate } from "@/utils/data/user/userUpdate";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(req: Request) {
  console.log("Webhook Triggered...");

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is missing from environment variables.");
    return new Response("Missing Clerk webhook secret.", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");
  

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers:", { svix_id, svix_timestamp, svix_signature });
    return new Response("Missing svix headers.", { status: 400 });
  }

  const payload = await req.json();
  console.log("Received Webhook Payload:", payload);

  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook.", { status: 400 });
  }

  const eventType = evt.type;
  console.log("Event Type:", eventType);

  switch (eventType) {
    case "user.created":
      console.log("Processing 'user.created' event...");
      try {
        const userData = {
          email: payload?.data?.email_addresses?.[0]?.email_address,
          first_name: payload?.data?.first_name,
          last_name: payload?.data?.last_name,
          profile_image_url: payload?.data?.profile_image_url,
          user_id: payload?.data?.id,
        };

        console.log("User Data to Insert:", userData);

        const result = await userCreate(userData);

        console.log("User Created in Supabase:", result);
        return NextResponse.json({
          status: 200,
          message: "User info inserted",
        });
      } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json({
          status: 400,
          message: error.message,
        });
      }

    case "user.updated":
      console.log("Processing 'user.updated' event...");
      try {
        const userData = {
          email: payload?.data?.email_addresses?.[0]?.email_address,
          first_name: payload?.data?.first_name,
          last_name: payload?.data?.last_name,
          profile_image_url: payload?.data?.profile_image_url,
          user_id: payload?.data?.id,
        };

        console.log("User Data to Update:", userData);

        const result = await userUpdate(userData);

        console.log("User Updated in Supabase:", result);
        return NextResponse.json({
          status: 200,
          message: "User info updated",
        });
      } catch (error: any) {
        console.error("Error updating user:", error);
        return NextResponse.json({
          status: 400,
          message: error.message,
        });
      }

    default:
      console.warn("Unhandled event type:", eventType);
      return new Response("Unhandled event type.", { status: 400 });
  }
}
