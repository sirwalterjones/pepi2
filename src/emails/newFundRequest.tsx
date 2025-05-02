import * as React from "react";
import { FundRequest } from "@/types/schema";

interface NewFundRequestEmailProps {
  request: FundRequest;
  agentName: string;
  amount: string;
  caseNumber?: string | null;
  requestDate: string;
  dashboardUrl: string;
}

export default function NewFundRequestEmail({
  request,
  agentName,
  amount,
  caseNumber,
  requestDate,
  dashboardUrl,
}: NewFundRequestEmailProps) {
  return (
    <div>
      <h1>New Fund Request Submitted</h1>
      <p>A new fund request has been submitted and requires your review.</p>

      <div
        style={{
          margin: "20px 0",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
        }}
      >
        <h2>Request Details</h2>
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
                <strong>Date Requested:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                {requestDate}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <strong>Status:</strong>
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
                <span
                  style={{
                    backgroundColor: "#FEF3C7",
                    color: "#92400E",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                  }}
                >
                  Pending Review
                </span>
              </td>
            </tr>
          </tbody>
        </table>
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
          Review Request
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
