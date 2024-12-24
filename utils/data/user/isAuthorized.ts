import { clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const isAuthorized = async (
  userId: string
): Promise<{ authorized: boolean; message: string }> => {
  const result = (await clerkClient()).users.getUser(userId);

  if (!result) {
    return {
      authorized: false,
      message: "User not found",
    };
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId);

    // Check if a row exists in the subscriptions table
    if (!data || data.length === 0) {
      return {
        authorized: false,
        message: "No subscription found for the user",
      };
    }

    // Check if the subscription is active
    if (data[0].status === "active") {
      return {
        authorized: true,
        message: "User is subscribed",
      };
    }

    return {
      authorized: false,
      message: "User does not have an active subscription",
    };
  } catch (error: any) {
    console.error("Error in isAuthorized:", error.message);
    return {
      authorized: false,
      message: "An error occurred while checking the subscription",
    };
  }
};
