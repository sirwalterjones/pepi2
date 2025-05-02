"use server";

import { createClient } from "../../../supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Transaction } from "@/types/schema";

// Action to approve a spending transaction
export async function approveSpendingTransactionAction(transactionId: string) {
  console.log(
    `[Server Action] approveSpendingTransactionAction called for ${transactionId}`,
  );
  const supabase = await createClient();

  // 1. Verify user is admin
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[Server Action] Authentication error:", userError);
    return { error: "Authentication required." };
  }
  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("id, name, role")
    .eq("user_id", user.id)
    .single();

  if (adminCheckError || !adminData || adminData.role !== "admin") {
    console.warn(
      `[Server Action] User ${user.id} without admin privileges attempted approve action.`,
    );
    return { error: "Admin privileges required." };
  }

  // 2. Fetch the transaction to ensure it's pending
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*, agent:agents!transactions_agent_id_fkey(name)")
    .eq("id", transactionId)
    .single();

  if (fetchError || !transaction) {
    console.error(
      `[Server Action] Transaction ${transactionId} not found for approval:`,
      fetchError,
    );
    return { error: "Transaction not found." };
  }

  if (transaction.status !== "pending") {
    console.warn(
      `[Server Action] Transaction ${transactionId} already processed (status: ${transaction.status}). Cannot approve.`,
    );
    return { error: "Transaction has already been processed." };
  }

  if (transaction.transaction_type !== "spending") {
    console.warn(
      `[Server Action] Transaction ${transactionId} is not a spending transaction (type: ${transaction.transaction_type}).`,
    );
    return {
      error: "Only spending transactions can be approved with this action.",
    };
  }

  // 3. Update the transaction status
  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      status: "approved",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", transactionId);

  if (updateError) {
    console.error(
      `[Server Action] Error approving transaction ${transactionId}:`,
      updateError,
    );
    return { error: "Failed to update transaction status." };
  }
  console.log(
    `[Server Action] Successfully approved transaction ${transactionId}.`,
  );

  // 4. Send email notification to the agent
  try {
    // Get agent email
    const { getAgentEmail } = await import("@/services/resend");
    const agentEmail = await getAgentEmail(transaction.agent_id);

    if (agentEmail) {
      // Format amount for display
      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(transaction.amount);

      // Format date for display
      const approvalDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Import email components and send service
      const { default: ApprovedSpendingTransactionEmail } = await import(
        "@/emails/approvedSpendingTransaction"
      );
      const { sendEmail } = await import("@/services/resend");

      // Get the origin for building the dashboard URL
      const origin = headers().get("origin") || "https://pepitracker.gov";
      const dashboardUrl = `${origin}/dashboard/transactions`;

      // Send email to the agent
      await sendEmail({
        to: agentEmail,
        subject: `Spending Transaction Approved: ${formattedAmount}`,
        react: ApprovedSpendingTransactionEmail({
          transaction: transaction as Transaction,
          agentName: transaction.agent?.name || "Agent",
          amount: formattedAmount,
          caseNumber: transaction.case_number,
          paidTo: transaction.paid_to,
          approvalDate: approvalDate,
          dashboardUrl: dashboardUrl,
          receiptNumber: transaction.receipt_number,
        }),
        from: "noreply@resend.dev", // Using Resend's verified domain
        tags: [{ name: "transaction_id", value: transactionId }],
      });

      console.log(
        `[Server Action] Email notification sent to agent ${transaction.agent_id} for approved spending transaction`,
      );
    } else {
      console.warn(
        `[Server Action] No email found for agent ${transaction.agent_id}`,
      );
    }
  } catch (emailError: any) {
    // Log email error but don't fail the transaction approval
    console.error(
      "[Server Action] Failed to send email notification for approved transaction:",
      emailError,
    );
  }

  // 5. Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");

  return { success: true };
}

// Action to reject a spending transaction
export async function rejectSpendingTransactionAction(
  transactionId: string,
  reason?: string | null,
) {
  console.log(
    `[Server Action] rejectSpendingTransactionAction called for ${transactionId} with reason: ${reason}`,
  );
  const supabase = await createClient();

  // 1. Verify user is admin
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[Server Action] Authentication error:", userError);
    return { error: "Authentication required." };
  }
  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("id, name, role")
    .eq("user_id", user.id)
    .single();

  if (adminCheckError || !adminData || adminData.role !== "admin") {
    console.warn(
      `[Server Action] User ${user.id} without admin privileges attempted reject action.`,
    );
    return { error: "Admin privileges required." };
  }

  // 2. Fetch the transaction to ensure it's pending
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*, agent:agents!transactions_agent_id_fkey(name)")
    .eq("id", transactionId)
    .single();

  if (fetchError || !transaction) {
    console.error(
      `[Server Action] Transaction ${transactionId} not found for rejection:`,
      fetchError,
    );
    return { error: "Transaction not found." };
  }

  if (transaction.status !== "pending") {
    console.warn(
      `[Server Action] Transaction ${transactionId} already processed (status: ${transaction.status}). Cannot reject.`,
    );
    return { error: "Transaction has already been processed." };
  }

  if (transaction.transaction_type !== "spending") {
    console.warn(
      `[Server Action] Transaction ${transactionId} is not a spending transaction (type: ${transaction.transaction_type}).`,
    );
    return {
      error: "Only spending transactions can be rejected with this action.",
    };
  }

  // 3. Update the transaction status and add rejection reason
  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      status: "rejected",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reason || null,
    })
    .eq("id", transactionId);

  if (updateError) {
    console.error(
      `[Server Action] Error rejecting transaction ${transactionId}:`,
      updateError,
    );
    return { error: "Failed to update transaction status." };
  }
  console.log(
    `[Server Action] Successfully rejected transaction ${transactionId}.`,
  );

  // 4. Send email notification to the agent
  try {
    // Get agent email
    const { getAgentEmail } = await import("@/services/resend");
    const agentEmail = await getAgentEmail(transaction.agent_id);

    if (agentEmail) {
      // Format amount for display
      const formattedAmount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(transaction.amount);

      // Format date for display
      const rejectionDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Import email components and send service
      const { default: RejectedSpendingTransactionEmail } = await import(
        "@/emails/rejectedSpendingTransaction"
      );
      const { sendEmail } = await import("@/services/resend");

      // Get the origin for building the dashboard URL
      const origin = headers().get("origin") || "https://pepitracker.gov";
      const dashboardUrl = `${origin}/dashboard/transactions`;

      // Send email to the agent
      await sendEmail({
        to: agentEmail,
        subject: `Spending Transaction Rejected: ${formattedAmount}`,
        react: RejectedSpendingTransactionEmail({
          transaction: transaction as Transaction,
          agentName: transaction.agent?.name || "Agent",
          amount: formattedAmount,
          caseNumber: transaction.case_number,
          paidTo: transaction.paid_to,
          rejectionDate: rejectionDate,
          rejectionReason: reason,
          dashboardUrl: dashboardUrl,
        }),
        from: "noreply@resend.dev", // Using Resend's verified domain
        tags: [{ name: "transaction_id", value: transactionId }],
      });

      console.log(
        `[Server Action] Email notification sent to agent ${transaction.agent_id} for rejected spending transaction`,
      );
    } else {
      console.warn(
        `[Server Action] No email found for agent ${transaction.agent_id}`,
      );
    }
  } catch (emailError: any) {
    // Log email error but don't fail the transaction rejection
    console.error(
      "[Server Action] Failed to send email notification for rejected transaction:",
      emailError,
    );
  }

  // 5. Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");

  return { success: true };
}
