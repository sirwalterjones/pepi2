import { createClient } from "@/utils/supabase-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Extract relevant data from the webhook payload
    const { type, email_id, to, subject, metadata = {} } = payload;

    const { requestId, paymentId, transactionId, emailType } = metadata;

    // Store the email event in the audit_logs table
    const supabase = await createClient();

    // Create an audit log entry for the email event
    const { error } = await supabase.from("audit_logs").insert({
      // No user_id as this is a system event
      ip_address: request.headers.get("x-forwarded-for") || "webhook",
      action: `email.${type.replace("email.", "")}`,
      entity_type: "email",
      entity_id: email_id,
      details: {
        email_id,
        recipient: to[0],
        subject,
        request_id: requestId,
        payment_id: paymentId,
        transaction_id: transactionId,
        email_type: emailType,
        created_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("[WEBHOOK] Error storing email event in audit log:", error);
      return NextResponse.json(
        { error: "Failed to log email event" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WEBHOOK] Error processing webhook:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
