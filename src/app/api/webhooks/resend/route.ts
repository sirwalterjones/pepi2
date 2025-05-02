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
      `Resend webhook received: ${payload.type} for email ${payload.data.email_id}`,
    );

    // Extract relevant information
    const { type, data } = payload;
    const { email_id, to, subject, tags } = data;

    // Get reference IDs from tags if available
    const requestId = tags?.find((tag) => tag.name === "requestId")?.value;
    const paymentId = tags?.find((tag) => tag.name === "paymentId")?.value;

    // Store the email event in your database if needed
    const supabase = await createClient();

    // Example: Store email delivery events in a hypothetical email_events table
    // You would need to create this table in your Supabase database
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
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error storing email event:', error);
    }
    */

    // Handle specific event types
    switch (type) {
      case "email.bounced":
        // Handle bounced emails (e.g., mark user email as invalid)
        console.log(`Email bounced for recipient: ${to[0]}`);
        break;

      case "email.complained":
        // Handle spam complaints
        console.log(`Spam complaint received for email: ${email_id}`);
        break;

      case "email.delivered":
        // Handle successful delivery
        console.log(`Email successfully delivered to: ${to[0]}`);
        break;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 },
    );
  }
}
