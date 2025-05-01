import TransactionDetails from "@/components/transactions/TransactionDetails";
import { useState } from "react";

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

  return (
    <div className="bg-white p-4">
      <h1 className="text-2xl font-bold mb-4">Transaction Details</h1>
      <p className="mb-4">
        This shows a rejected transaction that an agent can edit and resubmit.
      </p>

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
        onClick={() => setOpen(true)}
      >
        Open Transaction Details
      </button>

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
