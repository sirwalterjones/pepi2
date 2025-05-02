import * as React from "react";

interface RejectedCiPaymentEmailProps {
  paymentId: string;
  agentName: string;
  amount: string;
  caseNumber?: string | null;
  rejectionDate: string;
  rejectionReason: string;
  dashboardUrl: string;
  paidTo?: string | null;
}

export default function RejectedCiPaymentEmail({
  paymentId,
  agentName,
  amount,
  caseNumber,
  rejectionDate,
  rejectionReason,
  dashboardUrl,
  paidTo,
}: RejectedCiPaymentEmailProps) {
  return (
    <div>
      <h1>CI Payment Rejected</h1>
      <p>A CI payment has been rejected and requires your attention.</p>

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
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Date Rejected:</strong>
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

        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "#FEF3C7",
            borderRadius: "5px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", color: "#92400E" }}>
            Rejection Reason:
          </h3>
          <p style={{ margin: 0, color: "#92400E" }}>{rejectionReason}</p>
        </div>
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
          Go to Dashboard
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
