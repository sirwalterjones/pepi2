import { createClient } from "../../../supabase/client";

// A dedicated service for transaction operations
export class TransactionService {
  private static supabase = createClient();

  /**
   * Update a transaction in the database
   */
  static async updateTransaction(transactionId: string, updateData: any) {
    console.log(`[TransactionService] Updating transaction ${transactionId}`);
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
      const { data, error } = await this.supabase
        .from("transactions")
        .update(updateData)
        .eq("id", transactionId)
        .select();

      if (error) {
        console.error("[TransactionService] Update error:", error);
        throw error;
      }

      console.log("[TransactionService] Update successful:", data);

      // Fetch the complete updated transaction
      return await this.getTransactionById(transactionId);
    } catch (error: any) {
      console.error("[TransactionService] Error:", error);
      throw error;
    }
  }

  /**
   * Get a transaction by ID with agent details
   */
  static async getTransactionById(transactionId: string) {
    try {
      const { data, error } = await this.supabase
        .from("transactions")
        .select("*, agents:agent_id (id, name, badge_number)")
        .eq("id", transactionId)
        .single();

      if (error) {
        console.error("[TransactionService] Fetch error:", error);
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error("[TransactionService] Error fetching transaction:", error);
      throw error;
    }
  }
}
