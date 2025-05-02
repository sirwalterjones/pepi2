import * as React from "react";
import { Transaction } from "@/types/schema";

interface RejectedSpendingTransactionEmailProps {
  transaction: Transaction;
  agentName: string;
  amount: string;
  caseNumber?: string | null;
  paidTo?: string | null;
  rejectionDate: string;
  rejectionReason?: string | null;
  dashboardUrl: string;
}

export default function RejectedSpendingTransactionEmail({
  transaction,
  agentName,
  amount,
  caseNumber,
  paidTo,
  rejectionDate,
  rejectionReason,
  dashboardUrl,
}: RejectedSpendingTransactionEmailProps) {
  return (
    <div>
      <h1>Spending Transaction Rejected</h1>
      <p>
        Your spending transaction has been reviewed and was not approved at this
        time.
      </p>

      <div
        style={{
          margin: "20px 0",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      >
        <h2>Transaction Details</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Agent:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                {agentName}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Amount:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                {amount}
              </td>
            </tr>
            {paidTo && (
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                  <strong>Paid To:</strong>
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                  {paidTo}
                </td>
              </tr>
            )}
            {caseNumber && (
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                  <strong>Case Number:</strong>
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                  {caseNumber}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Rejection Date:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                {rejectionDate}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Status:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <span
                  style={{
                    backgroundColor: "#FEE2E2",
                    color: "#B91C1C",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                  }}
                >
                  Rejected
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {rejectionReason && (
          <div style={{ marginTop: "15px" }}>
            <h3>Reason for Rejection:</h3>
            <p
              style={{
                padding: "10px",
                backgroundColor: "#F3F4F6",
                borderRadius: "4px",
                borderLeft: "4px solid #D1D5DB",
              }}
            >
              {rejectionReason}
            </p>
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <a
          href={dashboardUrl}
          style={{
            backgroundColor: "#1D4ED8",
            color: "white",
            padding: "10px 15px",
            borderRadius: "5px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          View Dashboard
        </a>
      </div>

      <div style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}>
        <p>
          This is an automated message from the PEPI Money Tracker system.
          Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}
