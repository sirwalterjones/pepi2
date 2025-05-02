import { NextResponse } from "next/server";
import { sendEmail } from "@/services/resend";
import TestEmail from "@/emails/testEmail";
import { createElement } from "react";

export async function POST() {
  try {
    // Get current timestamp for the email
    const timestamp = new Date().toLocaleString();

    // Send an actual email using the Resend service
    const result = await sendEmail({
      to: "onboarding@resend.dev", // Using Resend's test email address
      subject: "PEPI Money Tracker - Test Email",
      react: createElement(TestEmail, { timestamp }),
      tags: [{ name: "email_type", value: "test_email" }],
    });

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
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
