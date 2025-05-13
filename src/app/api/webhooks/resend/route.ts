// Replace this

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
}
