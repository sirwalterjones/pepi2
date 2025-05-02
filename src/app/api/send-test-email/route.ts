import { NextResponse } from "next/server";
import { sendEmail } from "@/services/resend";
import TestEmail from "@/emails/testEmail";
import { createElement } from "react";

export async function POST() {
  try {
    // Get current timestamp for the email
    const timestamp = new Date().toLocaleString();

    // Log that email would be sent, but don't actually send it
    console.log(
      "[TEST EMAIL] Email sending disabled - would have sent to walterjonesjr@gmail.com",
    );

    // Return success without actually sending email
    return NextResponse.json({
      success: true,
      data: {
        id: "email-disabled",
        message: "Automatic emails have been disabled",
      },
    });

    /* Original email sending code commented out
    const result = await sendEmail({
      to: "walterjonesjr@gmail.com", // Using the specified email address
      subject: "PEPI Money Tracker - Test Email",
      react: createElement(TestEmail, { timestamp }),
      from: "noreply@resend.dev", // Using Resend's verified domain
      tags: [{ name: "email_type", value: "test_email" }],
    });
    */

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
