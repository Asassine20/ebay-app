import { NextResponse } from "next/server";
import config from "./config";

let clerkMiddleware: (arg0: (auth: any, req: any) => any) => { (arg0: any): any; new(): any; }, createRouteMatcher;

if (config.auth.enabled) {
  try {
    ({ clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server"));
  } catch (error) {
    console.warn("Clerk modules not available. Auth will be disabled.");
    config.auth.enabled = false;
  }
}

const isProtectedRoute = config.auth.enabled
  ? createRouteMatcher(["/dashboard(.*)", "/dashboard/inventory(.*)"])
  : () => false;

export default function middleware(req: any) {
  if (config.auth.enabled) {
    console.log("Checking route:", req.nextUrl.pathname); // Add this log

    return clerkMiddleware(async (auth, req) => {
      const resolvedAuth = await auth();
      console.log("Auth resolved:", resolvedAuth);

      if (!resolvedAuth.userId && isProtectedRoute(req)) {
        console.log("Protected route access denied:", req.nextUrl.pathname);

        return resolvedAuth.redirectToSignIn();
      } else {
        return NextResponse.next();
      }
    })(req);
  } else {
    return NextResponse.next();
  }
}

export const middlewareConfig = {
  matcher: [
    "/dashboard/:path*", // Include all `/dashboard` routes
    "/dashboard/inventory/:path*",
    "/(api|trpc)(.*)",   // Include API routes
    "/((?!_next/static|favicon\\.ico|[^?]*\\.(html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};