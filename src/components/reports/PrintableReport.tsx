"use client";

import React from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

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
  // Group transactions by type for the summary
  const issuanceTransactions =
    reportData?.filter(
      (t) => t.transaction_type === "issuance" && t.status === "approved",
    ) || [];

  const spendingTransactions =
    reportData?.filter(
      (t) => t.transaction_type === "spending" && t.status === "approved",
    ) || [];

  const returnTransactions =
    reportData?.filter(
      (t) => t.transaction_type === "return" && t.status === "approved",
    ) || [];

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MM/dd/yyyy");
    } catch (e) {
      return "Invalid Date";
    }
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
            border-collapse: collapse;
            width: 100%;
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
          th,
          td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          .header {
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
            text-align: center;
            font-size: 12px;
          }
          .executive-summary {
            background-color: #f9f9f9;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
          }
          .financial-summary table {
            margin-bottom: 20px;
          }
          .signature-section {
            margin-top: 50px;
          }
          .signature-line {
            border-top: 1px solid #333;
            width: 200px;
            display: inline-block;
            text-align: center;
            padding-top: 5px;
            margin: 0 20px;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="header mb-6 border-b-2 border-gray-800 pb-4">
        <h1 className="text-2xl font-bold">
          {isMonthlyReport
            ? `PEPI FUND MONTHLY REPORT - ${format(new Date(), "MMMM yyyy")}`
            : "PEPI FUND TRANSACTION REPORT"}
        </h1>
        <div className="flex flex-wrap justify-between items-center mt-2">
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
            {stats.activePepiBookYear && (
              <p className="text-sm font-semibold">
                PEPI Book: {stats.activePepiBookYear}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="executive-summary mb-6 bg-gray-50 p-4 border border-gray-300 rounded">
        <h3 className="text-lg font-bold mb-3 border-b pb-1">
          Executive Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="font-semibold">Total Transactions:</p>
            <p className="text-lg">{stats.totalTransactions}</p>
          </div>
          <div>
            <p className="font-semibold">Reporting Period:</p>
            <p>
              {startDate && endDate
                ? `${format(startDate, "MM/dd/yyyy")} - ${format(endDate, "MM/dd/yyyy")}`
                : "Current Period"}
            </p>
          </div>
          <div>
            <p className="font-semibold">Current Balance:</p>
            <p className="text-lg font-bold">
              {formatCurrency(stats.currentBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary Table */}
      <div className="financial-summary mb-6">
        <h3 className="text-lg font-bold mb-3 border-b-2 border-gray-300 pb-1">
          Financial Summary
        </h3>
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 text-left">Category</th>
              <th className="border border-gray-300 p-2 text-right">Amount</th>
              <th className="border border-gray-300 p-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-medium">
                Total Funds Issued
              </td>
              <td className="border border-gray-300 p-2 text-right">
                {formatCurrency(stats.totalIssuance)}
              </td>
              <td className="border border-gray-300 p-2">
                {issuanceTransactions.length} issuance transactions
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-medium">
                Total Funds Spent
              </td>
              <td className="border border-gray-300 p-2 text-right">
                {formatCurrency(stats.spendingTotal)}
              </td>
              <td className="border border-gray-300 p-2">
                {spendingTransactions.length} spending transactions
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-medium">
                Total Funds Returned
              </td>
              <td className="border border-gray-300 p-2 text-right">
                {formatCurrency(stats.totalReturned)}
              </td>
              <td className="border border-gray-300 p-2">
                {returnTransactions.length} return transactions
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-2 font-bold">
                Cash on Hand (Safe)
              </td>
              <td className="border border-gray-300 p-2 text-right font-bold">
                {formatCurrency(stats.cashOnHand)}
              </td>
              <td className="border border-gray-300 p-2">
                Funds currently in safe
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="border border-gray-300 p-2 font-bold">
                Cash with Agents
              </td>
              <td className="border border-gray-300 p-2 text-right font-bold">
                {formatCurrency(stats.currentBalance - stats.cashOnHand)}
              </td>
              <td className="border border-gray-300 p-2">
                Funds currently with agents
              </td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-gray-300 p-2 font-bold">
                Total Current Balance
              </td>
              <td className="border border-gray-300 p-2 text-right font-bold">
                {formatCurrency(stats.currentBalance)}
              </td>
              <td className="border border-gray-300 p-2">
                Total funds available
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Transaction Details */}
      <h2 className="text-xl font-bold mb-2">Transaction Details</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse transactions-table">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Amount</th>
              <th className="border p-2 text-left">Agent</th>
              <th className="border p-2 text-left">Receipt #</th>
              <th className="border p-2 text-left">Description</th>
              <th className="border p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.map((transaction) => (
              <tr key={transaction.id} className="border-b">
                <td className="border p-2">
                  {formatDate(
                    transaction.transaction_date || transaction.created_at,
                  )}
                </td>
                <td className="border p-2 capitalize">
                  {transaction.transaction_type}
                </td>
                <td className="border p-2">
                  {formatCurrency(parseFloat(transaction.amount))}
                </td>
                <td className="border p-2">
                  {transaction.agents
                    ? `${transaction.agents.name} ${transaction.agents.badge_number ? `(${transaction.agents.badge_number})` : ""}`
                    : "N/A"}
                </td>
                <td className="border p-2">
                  {transaction.receipt_number || "N/A"}
                </td>
                <td className="border p-2">
                  {transaction.description || "N/A"}
                </td>
                <td className="border p-2 capitalize">
                  {transaction.status || "approved"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="border p-2 text-right">
                Total Transactions: {reportData?.length || 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signature Section */}
      <div className="signature-section mt-8 pt-8">
        <div className="flex justify-between">
          <div>
            <div className="signature-line">
              <p>Prepared By</p>
            </div>
          </div>
          <div>
            <div className="signature-line">
              <p>Reviewed By</p>
            </div>
          </div>
          <div>
            <div className="signature-line">
              <p>Approved By</p>
            </div>
          </div>
        </div>
      </div>

      <div className="footer mt-4 text-xs text-center text-gray-500">
        PEPI Money Tracker - Official Transaction Report
      </div>
    </div>
  );
}
