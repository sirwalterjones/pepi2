import React from "react";
import { format } from "date-fns";

type PrintableReportProps = {
  reportData: any[] | null;
  stats: {
    totalAgents: number;
    totalTransactions: number;
    totalIssuance: number;
    totalReturned: number;
    currentBalance: number;
    cashOnHand: number;
    spendingTotal: number;
    activePepiBookYear: number | null;
  };
  startDate?: Date;
  endDate?: Date;
  isMonthlyReport?: boolean;
};

export default function PrintableReport({
  reportData,
  stats,
  startDate,
  endDate,
  isMonthlyReport = false,
}: PrintableReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="print-container p-4 bg-white" id="printable-report">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report,
          #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.5in;
          }
          .print-only {
            display: block !important;
            visibility: visible;
          }
          .no-print {
            display: none;
          }
          @page {
            size: letter;
            margin: 0.5in;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          .summary-table {
            margin-bottom: 20px;
          }
          .transactions-table th,
          .transactions-table td {
            padding: 4px 8px;
            font-size: 10pt;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {isMonthlyReport
            ? `PEPI Fund Monthly Report - ${format(new Date(), "MMMM yyyy")}`
            : "PEPI Fund Transaction Report"}
        </h1>
        <div className="flex flex-wrap justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              Generated on {format(new Date(), "MMMM d, yyyy")}
            </p>
            {startDate && endDate && (
              <p className="text-sm text-muted-foreground">
                Period: {format(startDate, "MMM d, yyyy")} to{" "}
                {format(endDate, "MMM d, yyyy")}
              </p>
            )}
            {isMonthlyReport && (
              <p className="text-sm text-muted-foreground font-semibold">
                Monthly Summary Report - Current Month
              </p>
            )}
            {stats.activePepiBookYear && (
              <p className="text-sm text-muted-foreground">
                PEPI Book: {stats.activePepiBookYear}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <table className="w-full border-collapse summary-table mb-6">
        <thead>
          <tr>
            <th
              colSpan={5}
              className="border bg-gray-100 p-2 text-left text-lg font-bold"
            >
              Financial Summary
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2 w-1/5">
              <div className="font-semibold">Total Funds Issued</div>
              <div className="text-lg font-bold">
                {formatCurrency(stats.totalIssuance)}
              </div>
            </td>
            <td className="border p-2 w-1/5">
              <div className="font-semibold">Total Funds Spent</div>
              <div className="text-lg font-bold">
                {formatCurrency(stats.spendingTotal || 0)}
              </div>
            </td>
            <td className="border p-2 w-1/5">
              <div className="font-semibold">Cash On Hand</div>
              <div className="text-lg font-bold">
                {formatCurrency(stats.cashOnHand)}
              </div>
            </td>
            <td className="border p-2 w-1/5">
              <div className="font-semibold">Current Balance</div>
              <div className="text-lg font-bold">
                {formatCurrency(stats.currentBalance)}
              </div>
            </td>
            <td className="border p-2 w-1/5">
              <div className="font-semibold">Active Agents</div>
              <div className="text-lg font-bold">{stats.totalAgents}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-xl font-bold mb-2">Transaction Details</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse transactions-table">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1 text-left text-sm">Date</th>
              <th className="border p-1 text-left text-sm">Type</th>
              <th className="border p-1 text-left text-sm">Amount</th>
              <th className="border p-1 text-left text-sm">Agent</th>
              <th className="border p-1 text-left text-sm">Receipt #</th>
              <th className="border p-1 text-left text-sm">Description</th>
              <th className="border p-1 text-left text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.map((transaction) => (
              <tr key={transaction.id} className="border-b">
                <td className="border p-1 text-sm">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </td>
                <td className="border p-1 text-sm capitalize">
                  {transaction.transaction_type}
                </td>
                <td className="border p-1 text-sm">
                  ${parseFloat(transaction.amount).toFixed(2)}
                </td>
                <td className="border p-1 text-sm">
                  {transaction.agents
                    ? `${transaction.agents.name} ${transaction.agents.badge_number ? `(${transaction.agents.badge_number})` : ""}`
                    : "N/A"}
                </td>
                <td className="border p-1 text-sm">
                  {transaction.receipt_number || "N/A"}
                </td>
                <td className="border p-1 text-sm">
                  {transaction.description || "N/A"}
                </td>
                <td className="border p-1 text-sm capitalize">
                  {transaction.status || "approved"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="border p-1 text-sm text-right">
                Total Transactions: {reportData?.length || 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 text-xs text-center text-gray-500">
        PEPI Money Tracker - Official Transaction Report
      </div>
    </div>
  );
}
