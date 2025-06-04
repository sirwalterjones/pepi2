"use client";

import React from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

type CbMemoReportProps = {
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
    agentCashBalance: number;
  };
};

const CbMemoReport: React.FC<CbMemoReportProps> = ({ data }) => {
  // Handle undefined data gracefully
  if (!data) {
    return <div className="p-4">No memo data available</div>;
  }

  // Ensure all numeric values are properly handled
  const safeData = {
    ...data,
    beginningBalance: Number(data.beginningBalance) || 0,
    totalAgentIssues: Number(data.totalAgentIssues) || 0,
    totalAgentReturns: Number(data.totalAgentReturns) || 0,
    cashOnHand: Number(data.cashOnHand) || 0,
    totalExpenditures: Number(data.totalExpenditures) || 0,
    totalAdditionalUnitIssue: Number(data.totalAdditionalUnitIssue) || 0,
    endingBalance: Number(data.endingBalance) || 0,
    ytdExpenditures: Number(data.ytdExpenditures) || 0,
    initialFunding: Number(data.initialFunding) || 0,
    issuedToAgents: Number(data.issuedToAgents) || 0,
    spentByAgents: Number(data.spentByAgents) || 0,
    returnedByAgents: Number(data.returnedByAgents) || 0,
    bookBalance: Number(data.bookBalance) || 0,
    cashWithAgents: Number(data.cashWithAgents) || 0,
    agentCashBalance: Number(data.agentCashBalance) || 0,
  };

  // Format the commander's initials for the footer
  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("");
  };

  const upperInitials = getInitials(safeData.commanderName).toUpperCase();
  const lowerInitials = getInitials(safeData.commanderName).toLowerCase();

  return (
    <div
      className="font-serif p-4 max-w-4xl mx-auto bg-white text-black print:shadow-none print:p-0 print:max-w-none print:w-full print:text-black"
      style={{ fontFamily: "'Times New Roman', serif" }}
    >
      {/* Header Section */}
      <div className="text-center mb-6 print:mb-6">
        <h1
          className="text-xl font-bold tracking-wider uppercase border-b-2 border-black pb-1 mb-6 inline-block"
          style={{
            fontSize: "24px",
            letterSpacing: "1px",
            textAlign: "center",
            display: "inline-block",
          }}
        >
          MEMORANDUM
        </h1>
      </div>

      {/* Memo Metadata */}
      <div
        className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 mb-6 text-sm relative print:mb-6 print:text-sm"
        style={{ marginLeft: "10%", marginRight: "10%" }}
      >
        <span
          className="font-bold"
          style={{ fontWeight: "bold", paddingRight: "10px" }}
        >
          TO:
        </span>
        <span>PEPI Account File</span>
        <span
          className="font-bold"
          style={{ fontWeight: "bold", paddingRight: "10px" }}
        >
          FROM:
        </span>
        <span className="flex items-center justify-between">
          <span>{safeData.commanderName}, Commander</span>
        </span>
        <span
          className="font-bold"
          style={{ fontWeight: "bold", paddingRight: "10px" }}
        >
          DATE:
        </span>
        <span>{safeData.memoDate}</span>
        <span
          className="font-bold"
          style={{ fontWeight: "bold", paddingRight: "10px" }}
        >
          RE:
        </span>
        <span>
          PEPI for {safeData.monthName} {safeData.bookYear}
        </span>

        {/* CMANS Text Block */}
        <div className="absolute top-0 right-0 flex items-center justify-center p-1 print:absolute print:top-0 print:right-0">
          <span
            className="font-bold text-2xl text-black tracking-wider print:font-bold print:text-2xl print:text-black"
            style={{ fontSize: "32px", fontWeight: "bold" }}
          >
            CMANS
          </span>
        </div>
      </div>

      {/* Narrative Body */}
      <div
        className="mb-8 text-sm leading-relaxed space-y-3 print:mb-8 print:text-sm print:leading-relaxed"
        style={{ marginLeft: "10%", marginRight: "10%" }}
      >
        <p>
          On {safeData.reconciliationDate}, the CMANS PEPI account was
          reconciled for the month of {safeData.monthName} {safeData.bookYear}.
        </p>
        <p>
          The current overall balance is{" "}
          {formatCurrency(safeData.beginningBalance)}. CMANS Agents were issued{" "}
          {formatCurrency(safeData.totalAgentIssues)} during{" "}
          {safeData.monthName} {safeData.bookYear}. Agents returned{" "}
          {formatCurrency(safeData.totalAgentReturns)} for the month of{" "}
          {safeData.monthName} {safeData.bookYear}. Cash on hand was counted and
          verified at {formatCurrency(safeData.cashOnHand)} (current balance).
          CMANS Agents expended {formatCurrency(safeData.totalExpenditures)} for{" "}
          {safeData.monthName} {safeData.bookYear}.
          {safeData.totalAdditionalUnitIssue > 0 && (
            <span>
              {" "}
              Additional Unit issue of PEPI was{" "}
              {formatCurrency(safeData.totalAdditionalUnitIssue)}.
            </span>
          )}
          The CMANS PEPI balance at the end of {safeData.monthName} was{" "}
          {formatCurrency(safeData.endingBalance)} (current balance). The total
          expenditures for {safeData.bookYear} are{" "}
          {formatCurrency(safeData.ytdExpenditures)}.
        </p>
      </div>

      {/* Totals Table */}
      <div
        className="mb-8 print:mb-8"
        style={{ marginLeft: "10%", marginRight: "10%" }}
      >
        <h2
          className="text-center font-bold mb-2 text-sm print:text-sm print:font-bold"
          style={{ fontSize: "16px", fontWeight: "bold" }}
        >
          TOTALS
        </h2>
        <table
          className="w-full border-collapse border border-black text-sm print:w-full print:border-collapse print:border print:border-black print:text-sm"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <tbody>
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Initial Funding
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.initialFunding)}
                <span className="text-xs ml-1 text-gray-600">(Overall)</span>
              </td>
            </tr>
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Issued To Agents
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.issuedToAgents)}
                <span className="text-xs ml-1 text-gray-600">
                  ({safeData.monthName})
                </span>
              </td>
            </tr>
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Total Spent By Agents
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.spentByAgents)}
                <span className="text-xs ml-1 text-gray-600">
                  ({safeData.monthName})
                </span>
              </td>
            </tr>
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Total Returned By Agents
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.returnedByAgents)}
                <span className="text-xs ml-1 text-gray-600">
                  ({safeData.monthName})
                </span>
              </td>
            </tr>
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Book Balance (Safe Cash)
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.bookBalance)}
                <span className="text-xs ml-1 text-gray-600">(Current)</span>
              </td>
            </tr>
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Cash with Agents (Agent Cash on Hand)
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.cashWithAgents)}
                <span className="text-xs ml-1 text-gray-600">(Current)</span>
              </td>
            </tr>
            {safeData.totalAdditionalUnitIssue > 0 && (
              <tr className="border border-black">
                <td className="border border-black px-2 py-1">
                  Additional Unit Issue
                </td>
                <td className="border border-black px-2 py-1 text-right">
                  {formatCurrency(safeData.totalAdditionalUnitIssue)}
                  <span className="text-xs ml-1 text-gray-600">
                    ({safeData.monthName})
                  </span>
                </td>
              </tr>
            )}
            <tr className="border border-black">
              <td
                className="border border-black px-2 py-1"
                style={{ border: "1px solid black", padding: "8px" }}
              >
                Expenditures CY {safeData.bookYear}
              </td>
              <td
                className="border border-black px-2 py-1 text-right"
                style={{
                  border: "1px solid black",
                  padding: "8px",
                  textAlign: "right",
                }}
              >
                {formatCurrency(safeData.ytdExpenditures)}
                <span className="text-xs ml-1 text-gray-600">(Total)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Initials */}
      <div
        className="text-sm print:text-sm"
        style={{ marginLeft: "10%", marginRight: "10%" }}
      >
        {upperInitials}/{lowerInitials}
      </div>
    </div>
  );
};

export default CbMemoReport;
