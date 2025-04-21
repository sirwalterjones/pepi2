import TransactionForm from "@/components/transactions/TransactionForm";

export default function TransactionFormStoryboard() {
  return (
    <div className="bg-white p-4">
      <TransactionForm
        open={true}
        onOpenChange={() => {}}
        onTransactionCreated={() => console.log("Transaction created")}
      />
    </div>
  );
}
