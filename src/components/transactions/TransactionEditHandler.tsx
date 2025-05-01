"use client";

import { useState } from "react";
import { createClient } from "../../../supabase/client";
import { useToast } from "../ui/use-toast";

// This is a dedicated service for handling transaction edits
export function useTransactionEditHandler() {
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  const updateTransaction = async (transactionId: string, updateData: any) => {
    if (!transactionId) {
      console.error("No transaction ID provided for update");
      return { success: false, error: "No transaction ID provided" };
    }

    setIsUpdating(true);
    console.log(
      `[TransactionEditHandler] Updating transaction ${transactionId}`,
    );
    console.log("Update data:", updateData);

    try {
      // Always set status to pending when edited
      updateData.status = "pending";
      updateData.updated_at = new Date().toISOString();

      // Convert amount to string for Supabase if it's a number
      if (typeof updateData.amount === "number") {
        updateData.amount = updateData.amount.toString();
      }

      // Perform the update
      const { data, error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId)
        .select();

      if (error) {
        console.error("[TransactionEditHandler] Update error:", error);
        throw error;
      }

      console.log("[TransactionEditHandler] Update successful:", data);

      // Fetch the complete updated transaction
      const { data: updatedTransaction, error: fetchError } = await supabase
        .from("transactions")
        .select("*, agents:agent_id (id, name, badge_number)")
        .eq("id", transactionId)
        .single();

      if (fetchError) {
        console.error(
          "[TransactionEditHandler] Error fetching updated transaction:",
          fetchError,
        );
        throw fetchError;
      }

      return {
        success: true,
        data: updatedTransaction,
        message: "Transaction has been updated and resubmitted for approval",
      };
    } catch (error: any) {
      console.error("[TransactionEditHandler] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to update transaction",
      };
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateTransaction,
    isUpdating,
  };
}
