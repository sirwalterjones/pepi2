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
import { Download, Printer, Loader2, CalendarIcon } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function AgentMonthlyReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM"),
  );
  const { agents } = useAgents();
  const { activeBook } = usePepiBooks();
  const supabase = createClient();

  // Generate month options for the dropdown based on the active PEPI book year
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    // If there's an active book, use its year, otherwise use current year
    const bookYear = activeBook ? parseInt(activeBook.year) : currentYear;

    // Add "All Year" option
    options.push({ value: `${bookYear}-all`, label: `All Year ${bookYear}` });

    // Create options for all months in the PEPI book year
    for (let month = 0; month < 12; month++) {
      const date = new Date(bookYear, month, 1);
      // Skip future months
      if (date > today) continue;

      const value = format(date, "yyyy-MM");
      const label = format(date, "MMMM yyyy");
      options.push({ value, label });
    }

    // Sort in descending order (most recent first)
    return options.sort((a, b) => {
      // Keep "All Year" at the top
      if (a.value.includes("-all")) return -1;
      if (b.value.includes("-all")) return 1;
      return b.value.localeCompare(a.value);
    });
  };

  const monthOptions = getMonthOptions();

  // Set default selected month to the most recent month in the options
  useEffect(() => {
    if (monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, [activeBook?.year]);

  const generateMonthlyReport = async () => {
    setIsGenerating(true);
    setReportData(null);

    try {
      // Check if "All Year" is selected
      const isAllYear = selectedMonth.includes("-all");
      let firstDayOfMonth, lastDayOfMonth, formattedFirstDay, formattedLastDay;

      if (isAllYear) {
        // Parse the year from the "All Year" option
        const year = parseInt(selectedMonth.split("-")[0]);
        // Get date range for the entire year
        firstDayOfMonth = new Date(year, 0, 1); // January 1st
        lastDayOfMonth = new Date(year, 11, 31); // December 31st
      } else {
        // Parse the selected month
        const [year, month] = selectedMonth.split("-").map(Number);
        const selectedDate = new Date(year, month - 1); // month is 0-indexed in JS Date

        // Get date range for the selected month
        firstDayOfMonth = startOfMonth(selectedDate);
        lastDayOfMonth = endOfMonth(selectedDate);
      }

      // Format dates properly for Supabase query
      formattedFirstDay = firstDayOfMonth.toISOString();
      formattedLastDay = lastDayOfMonth.toISOString();

      console.log(
        `Fetching transactions from ${formattedFirstDay} to ${formattedLastDay}`,
      );

      // Get all active agents, including admins
      const activeAgents = agents.filter((agent) => agent.is_active);

      // Prepare report data structure
      const reportByAgent = {};

      // For each agent, get their transactions
      for (const agent of activeAgents) {
        // Get transactions for this agent in the selected month
        // First try to filter by transaction_date if it exists
        let query = supabase
          .from("transactions")
          .select("*")
          .eq("agent_id", agent.id)
          .order("created_at", { ascending: true });

        // Use transaction_date if available, otherwise fall back to created_at
        query = query.or(
          `transaction_date.gte.${formattedFirstDay},transaction_date.lte.${formattedLastDay},and(created_at.gte.${formattedFirstDay},created_at.lte.${formattedLastDay})`,
        );

        const { data: transactions, error } = await query;

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
          // Double-check that we're only including transactions from the selected month
          const filteredTransactions = transactions.filter((transaction) => {
            const transactionDate = new Date(
              transaction.transaction_date || transaction.created_at,
            );
            return (
              transactionDate >= firstDayOfMonth &&
              transactionDate <= lastDayOfMonth
            );
          });

          // Add to report data
          reportByAgent[agent.id] = {
            agent,
            transactions: filteredTransactions || [],
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

    // Get selected month and year for the header
    let currentMonth;
    if (selectedMonth.includes("-all")) {
      const year = selectedMonth.split("-")[0];
      currentMonth = `Full Year ${year}`;
    } else {
      const [year, month] = selectedMonth.split("-").map(Number);
      const selectedDate = new Date(year, month - 1);
      currentMonth = format(selectedDate, "MMMM yyyy");
    }

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
              <td>${format(new Date(transaction.transaction_date || transaction.created_at || new Date()), "MM/dd/yyyy")}</td>
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
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1">
              <label
                htmlFor="month-select"
                className="block text-sm font-medium mb-1"
              >
                Select Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p>
            This report will generate a printable document for each active agent
            and administrator who has transactions, showing their activity for
            the selected month, with totals and signature lines for
            verification.
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
                transactions for{" "}
                {selectedMonth.includes("-all")
                  ? `Full Year ${selectedMonth.split("-")[0]}`
                  : format(
                      new Date(
                        parseInt(selectedMonth.split("-")[0]),
                        parseInt(selectedMonth.split("-")[1]) - 1,
                      ),
                      "MMMM yyyy",
                    )}
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
