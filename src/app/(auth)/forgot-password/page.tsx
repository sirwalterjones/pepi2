import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions";
import { UrlProvider } from "@/components/url-provider";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  if ("message" in searchParams) {
    return (
      <div className="flex h-screen w-full flex-1 items-center justify-center p-4 sm:max-w-md">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-md rounded-xl border border-blue-100 bg-white p-5 sm:p-8 shadow-lg">
        <div className="mb-4 sm:mb-6 flex justify-center">
          <div className="flex h-14 sm:h-16 w-14 sm:w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Shield className="h-7 sm:h-8 w-7 sm:w-8" />
          </div>
        </div>

        <UrlProvider>
          <form className="flex flex-col space-y-6">
            <div className="space-y-1 sm:space-y-2 text-center">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Reset Password
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-all"
                  href="/sign-in"
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <SubmitButton
              formAction={forgotPasswordAction}
              pendingText="Sending reset link..."
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              Reset Password
            </SubmitButton>

            <FormMessage message={searchParams} />

            <div className="pt-2 text-center text-xs text-gray-500">
              <p>Authorized access only. This system is monitored.</p>
            </div>
          </form>
        </UrlProvider>
      </div>
    </div>
  );
}
