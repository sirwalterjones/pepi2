import TransactionStatus from "@/components/transactions/TransactionStatus";

export default function TransactionStatusStoryboard() {
  return (
    <div className="bg-white p-8 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Pending Status</h3>
        <div className="flex flex-col gap-4">
          <TransactionStatus status="pending" size="sm" />
          <TransactionStatus status="pending" size="md" />
          <TransactionStatus status="pending" size="lg" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Approved Status</h3>
        <div className="flex flex-col gap-4">
          <TransactionStatus status="approved" size="sm" />
          <TransactionStatus status="approved" size="md" />
          <TransactionStatus status="approved" size="lg" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Rejected Status</h3>
        <div className="flex flex-col gap-4">
          <TransactionStatus status="rejected" size="sm" />
          <TransactionStatus status="rejected" size="md" />
          <TransactionStatus status="rejected" size="lg" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Without Icons</h3>
        <div className="flex flex-col gap-4">
          <TransactionStatus status="pending" showIcon={false} />
          <TransactionStatus status="approved" showIcon={false} />
          <TransactionStatus status="rejected" showIcon={false} />
        </div>
      </div>
    </div>
  );
}
