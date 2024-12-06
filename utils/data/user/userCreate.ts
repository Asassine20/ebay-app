import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { userCreateProps } from "@/utils/types";

export const userCreate = async ({
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: userCreateProps) => {
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
    // Check for existing user
    const existingUser = await supabase
      .from("user")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (existingUser.data) {
      console.log("User already exists:", existingUser.data);
      return existingUser.data;
    }

    // Insert new user
    const { data, error } = await supabase
      .from("user")
      .insert([
        {
          email,
          first_name,
          last_name,
          profile_image_url,
          user_id,
        },
      ])
      .select();

    console.log("Insert Data:", data);
    console.log("Insert Error:", error);

    if (error) {
      console.error("Supabase Insert Error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return error;
    }

    return data;
  } catch (error: any) {
    console.error("Unexpected Error:", error);
    throw new Error(error.message);
  }
};
