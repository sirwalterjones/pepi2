import TransactionDetails from "@/components/transactions/TransactionDetails";

export default function TransactionDetailsStoryboard() {
  const mockTransaction = {
    id: "123456",
    transaction_type: "issuance",
    amount: 500,
    receipt_number: "ISS-123456",
    description: "Initial fund issuance",
    created_at: new Date().toISOString(),
    status: "pending",
    agents: {
      name: "John Doe",
      badge_number: "B12345",
    },
  };

  return (
    <div className="bg-white p-4">
      <TransactionDetails
        transaction={mockTransaction}
        open={true}
        onOpenChange={() => {}}
      />
    </div>
  );
}
