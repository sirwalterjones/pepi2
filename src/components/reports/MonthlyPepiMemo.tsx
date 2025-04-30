// src/components/reports/MonthlyPepiMemo.tsx
import React from "react";
import { MonthlyPepiMemoData } from "@/app/actions"; // Assuming type is exported from actions
import { formatCurrency } from "@/lib/utils"; // Assuming you have a currency formatting util

// Optional: If you have the logo image in your public folder
// import Image from 'next/image';

type MonthlyPepiMemoProps = {
  data: MonthlyPepiMemoData;
};

const MonthlyPepiMemo: React.FC<MonthlyPepiMemoProps> = ({ data }) => {
  // Helper for formatting numbers, could be expanded
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "N/A";
    // Use a standard number format, currency is handled by formatCurrency
    return num.toLocaleString("en-US");
  };

  // Ensure all values are properly calculated and displayed
  const memoData = {
    ...data,
    // Make sure cashOnHand is calculated correctly
    cashOnHand: data.endingBalance,
    // Ensure all values are numbers (not null/undefined)
    beginningBalance: data.beginningBalance || 0,
    totalAgentIssues: data.totalAgentIssues || 0,
    totalAgentReturns: data.totalAgentReturns || 0,
    totalExpenditures: data.totalExpenditures || 0,
    totalAdditionalUnitIssue: data.totalAdditionalUnitIssue || 0,
    endingBalance: data.endingBalance || 0,
    ytdExpenditures: data.ytdExpenditures || 0,
  };

  return (
    <div className="font-serif p-4 max-w-4xl mx-auto bg-white text-black print:shadow-none print:p-0">
      {/* Header Section */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold tracking-wider uppercase border-b-2 border-black pb-1 mb-6 inline-block">
          MEMORANDUM
        </h1>
      </div>

      {/* Memo Metadata */}
      <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 mb-6 text-sm relative">
        <span className="font-bold">TO:</span>
        <span>PEPI Account File</span>
        <span className="font-bold">FROM:</span>
        <span className="flex items-center justify-between">
          <span>{memoData.commanderName}, Commander</span>
        </span>
        <span className="font-bold">DATE:</span>
        <span>{memoData.memoDate}</span>
        <span className="font-bold">RE:</span>
        <span>
          PEPI for {memoData.monthName} {memoData.bookYear}
        </span>

        {/* CMANS Text Block */}
        <div className="absolute top-0 right-0 flex items-center justify-center p-1">
          <span className="font-bold text-2xl text-black tracking-wider">
            CMANS
          </span>
        </div>
      </div>

      {/* Narrative Body */}
      <div className="mb-8 text-sm leading-relaxed space-y-3">
        <p>
          On {memoData.reconciliationDate}, the CMANS PEPI account was
          reconciled for the month of {memoData.monthName} {memoData.bookYear}.
        </p>
        <p>
          The beginning balance for {memoData.monthName} {memoData.bookYear} was{" "}
          {formatCurrency(memoData.beginningBalance)}. CMANS Agents were issued{" "}
          {formatCurrency(memoData.totalAgentIssues)} during{" "}
          {memoData.monthName} {memoData.bookYear}. Agents returned{" "}
          {formatCurrency(memoData.totalAgentReturns)} for the month of{" "}
          {memoData.monthName} {memoData.bookYear}. Cash on hand was counted and
          verified at {formatCurrency(memoData.endingBalance)}. CMANS Agents
          expended {formatCurrency(memoData.totalExpenditures)} for{" "}
          {memoData.monthName} {memoData.bookYear}.
          {memoData.totalAdditionalUnitIssue > 0 && (
            <span>
              {" "}
              Additional Unit issue of PEPI was{" "}
              {formatCurrency(memoData.totalAdditionalUnitIssue)}.
            </span>
          )}
          The CMANS PEPI balance at the end of {memoData.monthName} was{" "}
          {formatCurrency(memoData.endingBalance)}. The year-to-date
          expenditures totaled {formatCurrency(memoData.ytdExpenditures)}.
        </p>
      </div>

      {/* Totals Table */}
      <div className="mb-8">
        <h2 className="text-center font-bold mb-2 text-sm">TOTALS</h2>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            {/* Optional: Add headers if needed, but sample has none */}
          </thead>
          <tbody>
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">
                Beginning Balance
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.beginningBalance)}
              </td>
            </tr>
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">Agent Issue</td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.totalAgentIssues)}
              </td>
            </tr>
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">Agent Return</td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.totalAgentReturns)}
              </td>
            </tr>
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">Cash on Hand</td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.endingBalance)}
              </td>
            </tr>
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">Expenditures</td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.totalExpenditures)}
              </td>
            </tr>
            {memoData.totalAdditionalUnitIssue > 0 && (
              <tr className="border border-black">
                <td className="border border-black px-2 py-1">
                  Additional Unit Issue
                </td>
                <td className="border border-black px-2 py-1 text-right">
                  {formatCurrency(memoData.totalAdditionalUnitIssue)}
                </td>
              </tr>
            )}
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">Ending Balance</td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.endingBalance)}
              </td>
            </tr>
            <tr className="border border-black">
              <td className="border border-black px-2 py-1">
                Expenditures CY {memoData.bookYear}
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {formatCurrency(memoData.ytdExpenditures)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Initials */}
      <div className="text-sm">
        {/* Placeholder for initials - you might want to derive this from commander name */}
        {memoData.commanderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()}
        /
        {memoData.commanderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toLowerCase()}
      </div>
    </div>
  );
};

export default MonthlyPepiMemo;
