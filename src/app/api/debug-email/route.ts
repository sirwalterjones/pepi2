import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/services/resend";
import TestEmail from "@/emails/testEmail";
import { createElement } from "react";

export async function GET(request: NextRequest) {
  try {
    console.log("[DEBUG] Email debug endpoint called");

    // Get current timestamp for the email
    const timestamp = new Date().toLocaleString();

    // Log environment variables (without exposing sensitive values)
    console.log("[DEBUG] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);

    // Send an actual email using the Resend service
    console.log("[DEBUG] Attempting to send test email...");
    const result = await sendEmail({
      to: "walterjonesjr@gmail.com", // Using the specified email address
      subject: "PEPI Money Tracker - Debug Email Test",
      react: createElement(TestEmail, { timestamp }),
      from: "noreply@resend.dev", // Using Resend's verified domain
      tags: [{ name: "email_type", value: "debug_test" }],
    });

    console.log("[DEBUG] Email send result:", result);

    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Unknown error sending email",
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error("[DEBUG] Error in debug-email endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
