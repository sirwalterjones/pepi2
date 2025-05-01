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
      // Always set status to pending when edited by an agent
      updateData.status = "pending";

      // Log the update operation for debugging
      console.log(
        "[TransactionEditHandler] Setting transaction to pending status",
      );
      updateData.updated_at = new Date().toISOString();

      // Ensure amount is properly formatted for Supabase
      if (updateData.amount !== undefined) {
        // Convert to number first to ensure proper formatting
        const numAmount =
          typeof updateData.amount === "string"
            ? parseFloat(updateData.amount)
            : updateData.amount;
        // Then convert to string for Supabase
        updateData.amount = numAmount.toString();
      }

      // Perform the update
      const { error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId);

      if (error) {
        console.error("[TransactionEditHandler] Update error:", error);
        throw error;
      }

      // Fetch the updated transaction in a separate query
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("*, agents:agent_id (id, name, badge_number)")
        .eq("id", transactionId)
        .single();

      if (fetchError) {
        console.error("[TransactionEditHandler] Fetch error:", fetchError);
        throw fetchError;
      }

      console.log(
        "[TransactionEditHandler] Update successful, fetched data:",
        data,
      );

      if (!data) {
        console.error("[TransactionEditHandler] No data returned from fetch");
        throw new Error("No data returned from fetch operation");
      }

      return {
        success: true,
        data: data,
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
