import * as React from "react";

interface ApprovedCiPaymentEmailProps {
  paymentId: string;
  agentName: string;
  amount: string;
  caseNumber?: string | null;
  approvalDate: string;
  dashboardUrl: string;
  receiptNumber?: string;
  paidTo?: string | null;
}

export default function ApprovedCiPaymentEmail({
  paymentId,
  agentName,
  amount,
  caseNumber,
  approvalDate,
  dashboardUrl,
  receiptNumber,
  paidTo,
}: ApprovedCiPaymentEmailProps) {
  return (
    <div>
      <h1>CI Payment Approved</h1>
      <p>A CI payment has been approved and is ready for processing.</p>

      <div
        style={{
          margin: "20px 0",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      >
        <h2>Payment Details</h2>
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
            {receiptNumber && (
              <tr>
                <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                  <strong>Receipt Number:</strong>
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                  {receiptNumber}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Date Approved:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                {approvalDate}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Status:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <span
                  style={{
                    backgroundColor: "#DCFCE7",
                    color: "#166534",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                  }}
                >
                  Approved
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "20px" }}>
        <a
          href={`${dashboardUrl}/ci-payments/${paymentId}/receipt`}
          style={{
            backgroundColor: "#1D4ED8",
            color: "white",
            padding: "10px 15px",
            borderRadius: "5px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          View Receipt
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
