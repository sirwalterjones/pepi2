import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../supabase/server";

// Define the structure of Resend webhook events
type ResendWebhookEvent = {
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    tags?: { name: string; value: string }[];
  };
  type:
    | "email.sent"
    | "email.delivered"
    | "email.delivery_delayed"
    | "email.complained"
    | "email.bounced"
    | "email.opened"
    | "email.clicked";
};

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if you have a webhook secret
    // This is a simplified version without signature verification
    // For production, implement proper signature verification

    // Parse the webhook payload
    const payload = (await request.json()) as ResendWebhookEvent;

    // Log the event for debugging
    console.log(
      `[WEBHOOK] Resend webhook received: ${payload.type} for email ${payload.data.email_id}`,
    );
    console.log(`[WEBHOOK] Full payload:`, JSON.stringify(payload, null, 2));

    // Extract relevant information
    const { type, data } = payload;
    const { email_id, to, subject } = data;

    // Ensure tags is always an array
    const tags = Array.isArray(data.tags) ? data.tags : [];

    // Log the tags structure to help debug
    console.log(
      `[WEBHOOK] Tags structure:`,
      typeof tags,
      Array.isArray(tags) ? "is array" : "not array",
      tags,
    );

    // Get reference IDs from tags if available
    // Since we've already ensured tags is an array, we can safely use find
    const requestId = tags.find((tag) => tag?.name === "requestId")?.value;
    const paymentId = tags.find((tag) => tag?.name === "paymentId")?.value;
    const transactionId = tags.find(
      (tag) => tag?.name === "transaction_id",
    )?.value;
    const emailType = tags.find((tag) => tag?.name === "email_type")?.value;

    console.log(
      `[WEBHOOK] Email tags: requestId=${requestId}, paymentId=${paymentId}, transactionId=${transactionId}, emailType=${emailType}`,
    );

    // Store the email event in your database if needed
    const supabase = await createClient();

    // Example: Store email delivery events in a hypothetical email_events table
    /*
    const { error } = await supabase
      .from('email_events')
      .insert({
        email_id,
        event_type: type,
        recipient: to[0],
        subject,
        request_id: requestId,
        payment_id: paymentId,
        transaction_id: transactionId,
        email_type: emailType,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('[WEBHOOK] Error storing email event:', error);
    }
    */

    // Handle specific event types
    switch (type) {
      case "email.bounced":
        // Handle bounced emails (e.g., mark user email as invalid)
        console.log(`[WEBHOOK] Email bounced for recipient: ${to[0]}`);
        break;

      case "email.complained":
        // Handle spam complaints
        console.log(`[WEBHOOK] Spam complaint received for email: ${email_id}`);
        break;

      case "email.delivered":
        // Handle successful delivery
        console.log(`[WEBHOOK] Email successfully delivered to: ${to[0]}`);
        break;

      case "email.sent":
        // Handle email sent event
        console.log(`[WEBHOOK] Email successfully sent to: ${to[0]}`);
        break;

      case "email.opened":
        // Handle email opened event
        console.log(`[WEBHOOK] Email opened by: ${to[0]}`);
        break;

      case "email.clicked":
        // Handle email link clicked event
        console.log(`[WEBHOOK] Email link clicked by: ${to[0]}`);
        break;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 },
    );
  }
}
