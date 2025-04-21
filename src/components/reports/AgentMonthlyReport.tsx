"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { useAgents } from "@/hooks/useAgents";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { Download, Printer, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function AgentMonthlyReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const { agents } = useAgents();
  const { activeBook } = usePepiBooks();
  const supabase = createClient();

  const generateMonthlyReport = async () => {
    setIsGenerating(true);
    setReportData(null);

    try {
      // Get current month date range
      const today = new Date();
      const firstDayOfMonth = startOfMonth(today);
      const lastDayOfMonth = endOfMonth(today);

      // Format dates properly for Supabase query
      const formattedFirstDay = firstDayOfMonth.toISOString();
      const formattedLastDay = lastDayOfMonth.toISOString();

      console.log(
        `Fetching transactions from ${formattedFirstDay} to ${formattedLastDay}`,
      );

      // Get all active agents, including admins
      const activeAgents = agents.filter((agent) => agent.is_active);

      // Prepare report data structure
      const reportByAgent = {};

      // For each agent, get their transactions
      for (const agent of activeAgents) {
        // Get transactions for this agent in the current month
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("agent_id", agent.id)
          .gte("created_at", formattedFirstDay)
          .lte("created_at", formattedLastDay)
          .order("created_at", { ascending: true });

        if (error) {
          console.error(
            `Error fetching transactions for agent ${agent.id}:`,
            error.message || error,
          );
          // Continue with next agent instead of stopping completely
          continue;
        }

        // Calculate totals
        let issuanceTotal = 0;
        let spendingTotal = 0;
        let returnTotal = 0;

        transactions?.forEach((transaction) => {
          if (
            transaction.status === "approved" ||
            transaction.status === "pending"
          ) {
            if (transaction.transaction_type === "issuance") {
              issuanceTotal += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === "spending") {
              spendingTotal += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === "return") {
              returnTotal += parseFloat(transaction.amount);
            }
          }
        });

        // Calculate balance
        const balance = issuanceTotal - spendingTotal - returnTotal;

        // Add agents with transactions to the report, regardless of role
        if (transactions && transactions.length > 0) {
          // Add to report data
          reportByAgent[agent.id] = {
            agent,
            transactions: transactions || [],
            totals: {
              issuance: issuanceTotal,
              spending: spendingTotal,
              returned: returnTotal,
              balance,
            },
          };
        }
      }

      // Always set report data, even if empty
      setReportData(reportByAgent);

      if (Object.keys(reportByAgent).length === 0) {
        console.log(
          "No transactions found for any agents in the current month",
        );
      }
    } catch (error) {
      console.error("Error generating monthly report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const printReport = () => {
    if (!reportData) return;

    // Open a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Get current month and year for the header
    const currentMonth = format(new Date(), "MMMM yyyy");

    // Start building the HTML content
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Monthly Agent Report - ${currentMonth}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .report-header { text-align: center; margin-bottom: 30px; }
          .agent-report { margin-bottom: 40px; page-break-after: always; }
          .agent-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .agent-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .totals { margin-top: 20px; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
          .page-break { page-break-after: always; }
          .report-summary { margin-bottom: 30px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>PEPI Money Tracker - Monthly Agent Report</h1>
          <h2>${currentMonth}</h2>
          ${activeBook ? `<h3>PEPI Book: ${activeBook.year}</h3>` : ""}
        </div>
        
        <div class="report-summary">
          <h3>Report Summary</h3>
          <p>This report contains transaction details for ${Object.keys(reportData).length} personnel (agents and administrators) for the month of ${currentMonth}.</p>
        </div>
    `;

    // Add each agent's report
    Object.values(reportData).forEach((agentData: any) => {
      const { agent, transactions, totals } = agentData;

      htmlContent += `
        <div class="agent-report">
          <div class="agent-header">
            <h2>Agent: ${agent.name}</h2>
            <div>Date: ${format(new Date(), "MM/dd/yyyy")}</div>
          </div>
          
          <div class="agent-info">
            <div>Role: ${agent.role === "admin" ? "Administrator" : "Agent"}</div>
            <div>Badge Number: ${agent.badge_number || "N/A"}</div>
            <div>Email: ${agent.email || "N/A"}</div>
            <div>Phone: ${agent.phone || "N/A"}</div>
          </div>
          
          <h3>Transaction History</h3>
      `;

      if (transactions.length === 0) {
        htmlContent += `<p>No transactions recorded for this period.</p>`;
      } else {
        htmlContent += `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Receipt #</th>
                <th>Description</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
        `;

        transactions.forEach((transaction) => {
          htmlContent += `
            <tr>
              <td>${format(new Date(transaction.created_at), "MM/dd/yyyy")}</td>
              <td>${transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}</td>
              <td>$${parseFloat(transaction.amount).toFixed(2)}</td>
              <td>${transaction.receipt_number || "N/A"}</td>
              <td>${transaction.description || "N/A"}</td>
              <td>${transaction.status || "approved"}</td>
            </tr>
          `;
        });

        htmlContent += `
            </tbody>
          </table>
        `;
      }

      // Add totals section
      htmlContent += `
        <div class="totals">
          <h3>Monthly Summary</h3>
          <table>
            <tr>
              <th>Total Funds Issued</th>
              <th>Total Funds Spent</th>
              <th>Total Funds Returned</th>
              <th>Current Balance</th>
            </tr>
            <tr>
              <td>$${totals.issuance.toFixed(2)}</td>
              <td>$${totals.spending.toFixed(2)}</td>
              <td>$${totals.returned.toFixed(2)}</td>
              <td>$${totals.balance.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div class="signature-section">
          <div class="signature-line">Agent Signature</div>
          <div class="signature-line">Supervisor Signature</div>
        </div>
      </div>
      `;
    });

    // Close the HTML
    htmlContent += `
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print Report</button>
        </div>
      </body>
      </html>
    `;

    // Write to the new window and trigger print
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Agent Reports</CardTitle>
        <CardDescription>
          Generate monthly reports for all agents with transactions, including
          signature lines for verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p>
            This report will generate a printable document for each active agent
            and administrator who has transactions, showing their activity for
            the current month, with totals and signature lines for verification.
          </p>

          {reportData !== null && (
            <div
              className={
                Object.keys(reportData).length > 0
                  ? "bg-green-100 border border-green-300 text-green-800 p-4 rounded-md"
                  : "bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md"
              }
            >
              <p className="font-medium flex items-center">
                {Object.keys(reportData).length > 0 ? (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Report Ready
                  </>
                ) : (
                  <>Report Generated</>
                )}
              </p>
              <p className="text-sm mt-1">
                Found {Object.keys(reportData).length} personnel with
                transactions for {format(new Date(), "MMMM yyyy")}
              </p>
              {Object.keys(reportData).length > 0 ? (
                <p className="text-sm mt-2">
                  Click the Print Reports button to view and print individual
                  reports.
                </p>
              ) : (
                <p className="text-sm mt-2 text-amber-700">
                  No transactions found for any personnel this month. Try
                  selecting a different month or verify that transactions exist.
                </p>
              )}
            </div>
          )}

          {isGenerating && (
            <div className="bg-muted p-4 rounded-md">
              <p className="font-medium flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating report...
              </p>
            </div>
          )}

          {!isGenerating && reportData === null && (
            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                Click the Generate Monthly Report button to create reports for
                all active agents and administrators with transactions this
                month.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={generateMonthlyReport} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>Generate Monthly Report</>
          )}
        </Button>

        {reportData && (
          <Button variant="outline" onClick={printReport}>
            <Printer className="mr-2 h-4 w-4" />
            Print Reports
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
