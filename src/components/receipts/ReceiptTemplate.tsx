"use client";

import { TransactionType } from "@/types/schema";

interface ReceiptTemplateProps {
  transaction: any;
}

export default function ReceiptTemplate({ transaction }: ReceiptTemplateProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return "Fund Issuance";
      case "spending":
        return "Fund Expenditure";
      case "return":
        return "Fund Return";
      default:
        return "Transaction";
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">PEPI Money Tracker</h2>
        <p className="text-sm text-muted-foreground">Official Receipt</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between">
          <span className="font-medium">Receipt Number:</span>
          <span>{transaction.receipt_number}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium">Date:</span>
          <span>{formatDate(transaction.created_at)}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium">Transaction Type:</span>
          <span>{getTransactionTypeLabel(transaction.transaction_type)}</span>
        </div>

        {transaction.agent && (
          <div className="flex justify-between">
            <span className="font-medium">Agent:</span>
            <span>
              {transaction.agent.name}{" "}
              {transaction.agent.badge_number
                ? `(${transaction.agent.badge_number})`
                : ""}
            </span>
          </div>
        )}

        {transaction.description && (
          <div className="mt-4">
            <div className="font-medium mb-1">Description:</div>
            <div className="text-sm bg-muted/50 p-2 rounded">
              {transaction.description}
            </div>
          </div>
        )}

        <div className="border-t border-b py-4 my-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Amount:</span>
            <span className="text-xl font-bold">
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Thank you for using PEPI Money Tracker</p>
        <p className="mt-1">
          This is an official receipt for task force financial records.
        </p>
      </div>
    </div>
  );
}
