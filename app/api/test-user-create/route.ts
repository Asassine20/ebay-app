import { NextResponse } from "next/server";
import { userCreate } from "@/utils/data/user/userCreate";

export async function GET() {
  const testUser = {
    email: "manual_test3@example.com",
    first_name: "Manual4",
    last_name: "Test3",
    profile_image_url: "https://example.com/test-2profile.jpg",
    user_id: "233232",
  };
  console.log("Test user:", testUser);
  try {
    const result = await userCreate(testUser);
    console.log("Result:", result);
    return NextResponse.json({
      message: "User created successfully",
      result,
    });
  } catch (err: any) {
    console.error("Error in userCreate:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
