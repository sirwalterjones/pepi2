import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next();

  // --- Early exit for receipt path --- 
  // Check if the path is the specific dynamic route we are debugging
  // Regex to match /dashboard/ci-payments/ANY_ID/receipt
  const isReceiptPath = /^\/dashboard\/ci-payments\/[^\/]+\/receipt$/.test(req.nextUrl.pathname);
  if (isReceiptPath) {
      console.log(`Middleware immediately passing through receipt path: ${req.nextUrl.pathname}`);
      return res; // Return immediately, bypassing all auth checks for this path
  }
  // --- End early exit ---

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
            value: '',
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    },
  );

  // Refresh session if expired - **REPLACED with getUser for more robust check**
  const {
    data: { user }, // Destructure user directly
    error: getUserError, // Capture potential error
  } = await supabase.auth.getUser(); // Use getUser()

  if (getUserError) {
    // Log error but potentially allow request to proceed? Or redirect?
    // Let's log and treat as unauthenticated for now to be safe.
    console.error("Middleware Error fetching user:", getUserError);
    // Redirecting on error might be too aggressive, depends on requirements
  }

  // Redirect root path to sign-in or dashboard
  if (req.nextUrl.pathname === "/") {
    // If getUser found a user, redirect to dashboard
    if (user) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Otherwise (no user or getUser error), redirect to sign-in
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Check if the request is for protected routes
  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    // If getUser() didn't return a user object...
    if (!user) {
      // Check if the path is the specific dynamic route we are debugging
      // Regex to match /dashboard/ci-payments/ANY_ID/receipt
      const isReceiptPath = /^\/dashboard\/ci-payments\/[^\/]+\/receipt$/.test(req.nextUrl.pathname);

      if (!isReceiptPath) {
        // If it's NOT the receipt path, redirect as usual
        console.log(`Middleware redirecting to /sign-in (no user) for path: ${req.nextUrl.pathname}`);
        return NextResponse.redirect(new URL("/sign-in", req.url));
      } else {
        // If it IS the receipt path, log that we're skipping the redirect and let the page try to handle auth
        console.log(`Middleware skipping auth redirect for receipt path: ${req.nextUrl.pathname}, letting page handle auth.`);
        // Allow the request to proceed to the page component
      }
    }

    // If this is the dashboard root, check role for agent redirect
    if (req.nextUrl.pathname === "/dashboard") {
      // Ensure user is not null before accessing user.id
      if (user) {
         const { data: agentData } = await supabase
           .from("agents")
           .select("role")
           .eq("user_id", user.id) // Use user.id from getUser result
           .single();

         // If user is an agent but not an admin, redirect to transactions page
         if (agentData && agentData.role !== "admin") {
            console.log(`Middleware redirecting agent from /dashboard to /dashboard/transactions`);
            return NextResponse.redirect(
             new URL("/dashboard/transactions", req.url),
           );
         }
      } else {
          // Should not happen if the !user check above worked, but as a safeguard
          console.warn("Middleware: User object null unexpectedly at role check.");
          return NextResponse.redirect(new URL("/sign-in", req.url));
      }
    }
  }
  // --- End Dashboard Protection ---

  // Prevent logged-in users from accessing auth pages
  if (user && (req.nextUrl.pathname.startsWith("/sign-in") || req.nextUrl.pathname.startsWith("/forgot-password"))) {
       console.log(`Middleware redirecting logged-in user from auth page to /dashboard`);
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
