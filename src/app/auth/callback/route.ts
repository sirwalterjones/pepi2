import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  // Check if the redirect is to the protected/reset-password path and change it to dashboard/reset-password
  let redirectTo = redirect_to || "/dashboard";
  if (
    redirectTo.includes("/protected/reset-password") ||
    redirectTo === "/protected/reset-password"
  ) {
    redirectTo = "/dashboard/reset-password";
  }

  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin));
}
