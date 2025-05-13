import React from "react";
import { updateSession } from "./supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase/server";

export async function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const response = await updateSession(request);

  // Check if this is a sign-in or sign-out event
  // We can detect this by checking the URL path and cookies
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Get IP address
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check for sign-in event (session exists and path indicates auth callback)
    if (session && url.pathname === "/auth/callback") {
      await supabase.from("audit_logs").insert({
        user_id: session.user.id,
        ip_address: ip,
        action: "login",
        details: { method: "email", path: url.pathname },
      });
    }

    // Check for sign-out event (path indicates sign-out)
    if (
      url.pathname === "/sign-in" &&
      request.headers.get("referer")?.includes("/dashboard")
    ) {
      // This is a heuristic - if coming from dashboard to sign-in, likely a sign-out
      if (session) {
        await supabase.from("audit_logs").insert({
          user_id: session.user.id,
          ip_address: ip,
          action: "logout",
          details: { path: url.pathname },
        });
      }
    }
  } catch (error) {
    console.error("Error in auth audit logging middleware:", error);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
