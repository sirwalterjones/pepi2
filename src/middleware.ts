import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: "",
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    },
  );

  // Use getUser for more robust check with error handling
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    if (data && data.user) {
      user = data.user;
    }
  } catch (error) {
    // Silently handle AuthSessionMissingError as it's expected for non-authenticated users
    if (error.name !== "AuthSessionMissingError") {
      console.error("Exception in middleware auth check:", error);
    }
  }

  // Redirect root path
  if (req.nextUrl.pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    // Special case for receipt pages that can be opened in new tabs
    if (
      req.nextUrl.pathname.includes("/ci-payments/") &&
      req.nextUrl.pathname.includes("/receipt")
    ) {
      // Allow access to receipt pages without redirection
      // The server component will still verify access through RLS
      return res;
    }

    if (!user) {
      // This check now applies to ALL /dashboard paths again except receipts
      console.log(
        `Middleware redirecting to /sign-in (no user) for path: ${req.nextUrl.pathname}`,
      );
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Dashboard root agent redirect
    if (req.nextUrl.pathname === "/dashboard") {
      if (user) {
        try {
          const { data: agentData } = await supabase
            .from("agents")
            .select("role")
            .eq("user_id", user.id)
            .single();
          if (agentData && agentData.role !== "admin") {
            console.log(
              `Middleware redirecting agent from /dashboard to /dashboard/transactions`,
            );
            return NextResponse.redirect(
              new URL("/dashboard/transactions", req.url),
            );
          }
        } catch (error) {
          console.warn("Error fetching agent role:", error);
          return NextResponse.redirect(new URL("/sign-in", req.url));
        }
      } else {
        console.warn(
          "Middleware: User object null unexpectedly at role check.",
        );
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
    }
  }

  // Prevent logged-in users from accessing auth pages
  if (
    user &&
    (req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/forgot-password"))
  ) {
    console.log(
      `Middleware redirecting logged-in user from auth page to /dashboard`,
    );
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

// Ensure the middleware is only called for relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
