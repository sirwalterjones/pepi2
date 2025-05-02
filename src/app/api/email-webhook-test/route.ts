import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("[WEBHOOK-TEST] Email webhook test endpoint called");

    // Parse the webhook payload
    const payload = await request.json();

    // Log the entire payload for debugging
    console.log(
      "[WEBHOOK-TEST] Received webhook payload:",
      JSON.stringify(payload, null, 2),
    );

    return NextResponse.json({
      success: true,
      message: "Webhook received and logged",
    });
  } catch (error: any) {
    console.error("[WEBHOOK-TEST] Error processing webhook test:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
