"use client";

import TransactionDetails from "@/components/transactions/TransactionDetails";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

export default function TransactionDetailsStoryboard() {
  const [open, setOpen] = useState(true);

  // Sample rejected transaction data
  const sampleTransaction = {
    id: "12345678-1234-1234-1234-123456789012",
    amount: "150.00",
    description: "Evidence purchase for case #12345",
    receipt_number: "R-2023-001",
    transaction_type: "spending",
    status: "rejected",
    review_notes:
      "Please provide more details about the evidence purchase and update the receipt number.",
    created_at: "2023-06-15T10:30:00Z",
    updated_at: "2023-06-16T14:20:00Z",
    agent_id: "agent-123",
    created_by: "admin-456",
    spending_category: "Evidence Purchase",
    case_number: "12345",
    paid_to: "Confidential Informant",
    agent: {
      id: "agent-123",
      name: "John Doe",
      badge_number: "B-12345",
    },
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
  };

  const handleEdit = () => {
    console.log("Transaction edited");
  };

  const handleDelete = () => {
    console.log("Transaction deleted");
  };

  const handleTestEmail = async () => {
    try {
      toast({
        title: "Sending test email",
        description: "Attempting to send a test email notification...",
      });

      // This would be replaced with an actual API call in a real implementation
      console.log(
        "Test email triggered for transaction:",
        sampleTransaction.id,
      );

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Test email sent",
        description:
          "A test email notification has been triggered successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: "Failed to send test email. Check console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white p-4">
      <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>
      <p className="mb-4">
        This shows a rejected transaction that an agent can edit and resubmit.
      </p>

      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={() => setOpen(true)}
        >
          Open Transaction Details
        </button>

        <button
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleTestEmail}
        >
          Test Email Notification
        </button>
      </div>

      <TransactionDetails
        transaction={sampleTransaction}
        open={open}
        onOpenChange={handleOpenChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
