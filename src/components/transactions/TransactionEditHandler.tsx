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

      // Ensure review_notes is preserved if it exists
      if (updateData.review_notes === undefined) {
        console.log(
          "[TransactionEditHandler] Preserving existing review notes",
        );
        // We'll keep whatever is in the database
      }

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

      // CRITICAL FIX: Split update and fetch into separate operations
      console.log(
        `[TransactionEditHandler] Executing update operation for transaction ID: ${transactionId}`,
      );

      // Step 1: Perform the update operation
      const { error: updateError } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId);

      if (updateError) {
        console.error("[TransactionEditHandler] Update error:", updateError);
        throw updateError;
      }

      console.log(
        `[TransactionEditHandler] Update operation successful, now fetching updated data`,
      );

      // Step 2: Fetch the updated transaction in a separate query
      const { data: fetchedData, error: fetchError } = await supabase
        .from("transactions")
        .select("*, agents:agent_id (id, name, badge_number)")
        .eq("id", transactionId)
        .single();

      if (fetchError) {
        console.error("[TransactionEditHandler] Fetch error:", fetchError);
        throw fetchError;
      }

      console.log(
        "[TransactionEditHandler] Fetch successful, data:",
        fetchedData,
      );

      // Even if no data is returned from fetch, the update was successful
      // This prevents the "No data returned" error
      if (!fetchedData) {
        console.warn(
          "[TransactionEditHandler] No data returned from fetch, but update was successful",
        );
        // Return a success response with minimal data
        return {
          success: true,
          data: { id: transactionId, ...updateData },
          message: "Transaction has been updated and resubmitted for approval",
        };
      }

      return {
        success: true,
        data: fetchedData,
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
