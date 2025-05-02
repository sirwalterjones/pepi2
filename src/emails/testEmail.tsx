import * as React from "react";

interface TestEmailProps {
  timestamp: string;
}

export default function TestEmail({ timestamp }: TestEmailProps) {
  return (
    <div>
      <h1>PEPI Money Tracker - Test Email</h1>
      <p>This is a test email from the PEPI Money Tracker system.</p>

      <div
        style={{
          margin: "20px 0",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "5px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2>Test Details</h2>
        <p>
          This email was sent as a test to verify that the email notification
          system is working correctly.
        </p>
        <p>
          <strong>Timestamp:</strong> {timestamp}
        </p>
      </div>

      <div style={{ marginTop: "30px", fontSize: "12px", color: "#666" }}>
        <p>
          This is an automated test message from the PEPI Money Tracker system.
          Please do not reply to this email.
        </p>
      </div>
    </div>
  );
}
