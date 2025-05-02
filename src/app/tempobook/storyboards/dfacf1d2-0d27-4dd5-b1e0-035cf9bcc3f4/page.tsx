"use client";

import TransactionDetails from "@/components/transactions/TransactionDetails";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

export default function TransactionDetailsStoryboard() {
  const [open, setOpen] = useState(true);
  const [isSending, setIsSending] = useState(false);

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
      setIsSending(true);
      toast({
        title: "Sending test email",
        description: "Attempting to send a real test email notification...",
      });

      // Call the API endpoint to send the email
      const response = await fetch("/api/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Test email sent successfully",
          description: `Email sent with ID: ${result.data?.id}`,
          variant: "success",
        });
      } else {
        throw new Error(result.error || "Unknown error sending email");
      }
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Error",
        description: `Failed to send test email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white p-4">
      <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>
      <p className="mb-4">
        This shows a rejected transaction that an agent can edit and resubmit.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded shadow-lg"
          onClick={() => setOpen(true)}
        >
          Open Transaction Details
        </button>

        <button
          className="bg-green-600 hover:bg-green-800 text-white font-bold py-3 px-6 rounded shadow-lg flex items-center justify-center gap-2 border-2 border-green-700"
          onClick={handleTestEmail}
          disabled={isSending}
          style={{ minWidth: "220px" }}
        >
          {isSending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </>
          ) : (
            "Send Real Test Email"
          )}
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
