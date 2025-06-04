"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

type PrintableCbMemoProps = {
  data: {
    commanderName: string;
    memoDate: string;
    monthName: string;
    bookYear: string;
    reconciliationDate: string;
    beginningBalance: number;
    totalAgentIssues: number;
    totalAgentReturns: number;
    cashOnHand: number;
    totalExpenditures: number;
    totalAdditionalUnitIssue: number;
    endingBalance: number;
    ytdExpenditures: number;
    initialFunding: number;
    issuedToAgents: number;
    spentByAgents: number;
    returnedByAgents: number;
    bookBalance: number;
    cashWithAgents: number;
    agentCashBalance?: number; // Add optional agentCashBalance property
  };
};

const PrintableCbMemo: React.FC<PrintableCbMemoProps> = ({ data }) => {
  // Handle undefined data gracefully
  if (!data) {
    return <div>No memo data available</div>;
  }

  // Format the commander's initials for the footer
  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const upperInitials = getInitials(data.commanderName).toUpperCase();
  const lowerInitials = getInitials(data.commanderName).toLowerCase();

  return (
    <div className="memo-container">
      <style jsx global>{`
        @media print {
          @import url("https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap");

          body {
            margin: 0;
            padding: 0;
            font-family: "Times New Roman", serif;
            font-size: 12pt;
            line-height: 1.5;
            background: white;
            color: black;
          }

          .memo-container {
            width: 100%;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0;
          }

          .memo-title {
            text-align: center;
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 30px;
            text-transform: uppercase;
          }

          .memo-header {
            display: grid;
            grid-template-columns: 60px 1fr;
            gap: 10px;
            margin-bottom: 30px;
            position: relative;
          }

          .memo-header-label {
            font-weight: bold;
          }

          .memo-cmans {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 32pt;
            font-weight: bold;
          }

          .memo-body {
            margin-bottom: 30px;
            line-height: 1.5;
          }

          .memo-totals-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
          }

          .memo-table {
            width: 100%;
            border-collapse: collapse;
          }

          .memo-table td {
            border: 1px solid black;
            padding: 8px;
          }

          .memo-table td:last-child {
            text-align: right;
          }

          .memo-footer {
            margin-top: 20px;
          }

          .memo-label {
            color: #666;
            font-size: 0.8em;
            margin-left: 5px;
          }
        }
      `}</style>

      <h1 className="memo-title">MEMORANDUM</h1>

      <div className="memo-header">
        <div className="memo-header-label">TO:</div>
        <div>PEPI Account File</div>

        <div className="memo-header-label">FROM:</div>
        <div>{data.commanderName}, Commander</div>

        <div className="memo-header-label">DATE:</div>
        <div>{data.memoDate}</div>

        <div className="memo-header-label">RE:</div>
        <div>
          PEPI for {data.monthName} {data.bookYear}
        </div>

        <div className="memo-cmans">CMANS</div>
      </div>

      <div className="memo-body">
        <p>
          On {data.reconciliationDate}, the CMANS PEPI account was reconciled
          for the month of {data.monthName} {data.bookYear}.
        </p>
        <p>
          The current overall balance is {formatCurrency(data.beginningBalance)}
          . CMANS Agents were issued {formatCurrency(data.totalAgentIssues)}{" "}
          during {data.monthName} {data.bookYear}. Agents returned{" "}
          {formatCurrency(data.totalAgentReturns)} for the month of{" "}
          {data.monthName} {data.bookYear}. Cash on hand was counted and
          verified at {formatCurrency(data.cashOnHand)} (current balance). CMANS
          Agents expended {formatCurrency(data.totalExpenditures)} for{" "}
          {data.monthName} {data.bookYear}.
          {data.totalAdditionalUnitIssue > 0 && (
            <span>
              {" "}
              Additional Unit issue of PEPI was{" "}
              {formatCurrency(data.totalAdditionalUnitIssue)}.
            </span>
          )}
          The CMANS PEPI balance at the end of {data.monthName} was{" "}
          {formatCurrency(data.endingBalance)} (current balance). The total
          expenditures for {data.bookYear} are{" "}
          {formatCurrency(data.ytdExpenditures)}.
        </p>
      </div>

      <div className="memo-totals">
        <h2 className="memo-totals-title">TOTALS</h2>
        <table className="memo-table">
          <tbody>
            <tr>
              <td>Initial Funding</td>
              <td>
                {formatCurrency(data.initialFunding)}
                <span className="memo-label">(Overall)</span>
              </td>
            </tr>
            <tr>
              <td>Issued To Agents</td>
              <td>
                {formatCurrency(data.issuedToAgents)}
                <span className="memo-label">({data.monthName})</span>
              </td>
            </tr>
            <tr>
              <td>Total Spent By Agents</td>
              <td>
                {formatCurrency(data.spentByAgents)}
                <span className="memo-label">({data.monthName})</span>
              </td>
            </tr>
            <tr>
              <td>Total Returned By Agents</td>
              <td>
                {formatCurrency(data.returnedByAgents)}
                <span className="memo-label">({data.monthName})</span>
              </td>
            </tr>
            <tr>
              <td>Book Balance (Safe Cash)</td>
              <td>
                {formatCurrency(data.bookBalance)}
                <span className="memo-label">(Current)</span>
              </td>
            </tr>
            <tr>
              <td>Cash with Agents</td>
              <td>
                {formatCurrency(data.cashWithAgents)}
                <span className="memo-label">(Current)</span>
              </td>
            </tr>
            <tr>
              <td>Agent Cash on Hand</td>
              <td>
                {formatCurrency(data.agentCashBalance || 0)}
                <span className="memo-label">(Current)</span>
              </td>
            </tr>
            {data.totalAdditionalUnitIssue > 0 && (
              <tr>
                <td>Additional Unit Issue</td>
                <td>
                  {formatCurrency(data.totalAdditionalUnitIssue)}
                  <span className="memo-label">({data.monthName})</span>
                </td>
              </tr>
            )}
            <tr>
              <td>Expenditures CY {data.bookYear}</td>
              <td>
                {formatCurrency(data.ytdExpenditures)}
                <span className="memo-label">(Total)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="memo-footer">
        {upperInitials}/{lowerInitials}
      </div>
    </div>
  );
};

export default PrintableCbMemo;
