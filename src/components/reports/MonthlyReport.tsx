"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Printer,
  Loader2,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
} from "lucide-react";
import CbMemoReport from "./CbMemoReport";
import { Transaction } from "@/types/schema";
import PrintableReport from "./PrintableReport";
import { formatCurrency } from "@/lib/utils";

export default function MonthlyReport() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [activePepiBook, setActivePepiBook] = useState<any>(null);
  const [stats, setStats] = useState({
    totalIssuance: 0,
    totalSpending: 0,
    totalReturned: 0,
    safeCashBalance: 0,
    agentCashBalance: 0,
    totalAgents: 0,
    totalTransactions: 0,
    currentBalance: 0,
    cashOnHand: 0,
    spendingTotal: 0,
    activePepiBookYear: null,
  });

  const [showCbMemo, setShowCbMemo] = useState(false);
  const [commanderName, setCommanderName] = useState("Adam Mayfield");

  // Fetch all transactions and active PEPI book
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      try {
        // Get active PEPI book
        const { data: pepiBook } = await supabase
          .from("pepi_books")
          .select("*")
          .eq("is_active", true)
          .single();

        setActivePepiBook(pepiBook);

        // Get all transactions
        const { data, error } = await supabase
          .from("transactions")
          .select("*, agents(id, name, badge_number)")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching transactions:", error);
          throw error;
        }

        console.log(`Fetched ${data?.length || 0} total transactions`);
        setTransactions(data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate total expenditures for the entire year (not filtered by month)
  const totalSpentByAgents = transactions
    .filter((t) => t.status === "approved" && t.transaction_type === "spending")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  // Filter transactions by selected month and year
  useEffect(() => {
    if (!transactions.length) return;

    const filtered = transactions.filter((transaction) => {
      try {
        const dateToUse =
          transaction.transaction_date || transaction.created_at;
        if (!dateToUse) return false;

        const date = new Date(dateToUse);
        if (isNaN(date.getTime())) return false;

        return (
          date.getMonth() === selectedMonth &&
          date.getFullYear() === selectedYear
        );
      } catch (e) {
        console.error("Error filtering transaction:", e);
        return false;
      }
    });

    console.log(
      `Filtered to ${filtered.length} transactions for ${selectedMonth + 1}/${selectedYear}`,
    );
    setFilteredTransactions(filtered);

    // Calculate statistics for ALL transactions (not filtered by month)
    // This ensures the cash balances show the current totals
    let totalIssuedToAgents = 0;
    let totalSpentByAgents = 0;
    let totalReturnedByAgents = 0;
    let totalAddedToBook = 0;
    let initialAmount = activePepiBook?.starting_amount || 0;

    // Process all transactions to calculate balances
    transactions.forEach((transaction) => {
      if (transaction.status === "approved") {
        const amount = parseFloat(transaction.amount.toString());

        if (transaction.transaction_type === "issuance") {
          if (transaction.agent_id !== null) {
            // Issuance TO an agent
            totalIssuedToAgents += amount;
            // Does NOT affect book balance directly
          } else if (transaction.receipt_number?.startsWith("ADD")) {
            // Additions to the book (receipt starts with ADD)
            totalAddedToBook += amount;
          }
        } else if (transaction.transaction_type === "spending") {
          // All spending reduces the total balance
          totalSpentByAgents += amount;

          // If spent by an agent, reduce their cash on hand
          if (transaction.agent_id) {
            totalIssuedToAgents -= amount;
          }
        } else if (transaction.transaction_type === "return") {
          // Returns only affect agent cash on hand
          if (transaction.agent_id) {
            totalIssuedToAgents -= amount;
            totalReturnedByAgents += amount;
          }
        }
      }
    });

    // Calculate current balance: initial + additions - expenditures
    let pepiBookBalance = initialAmount + totalAddedToBook - totalSpentByAgents;

    // Calculate safe cash: current balance - what's issued to agents
    let safeCashBalance = pepiBookBalance - totalIssuedToAgents;

    // Calculate monthly filtered statistics
    let monthlyIssuance = 0;
    let monthlySpending = 0;
    let monthlyReturned = 0;

    // Process filtered transactions to calculate monthly stats
    filtered.forEach((transaction) => {
      if (transaction.status === "approved") {
        const amount = parseFloat(transaction.amount.toString());

        if (transaction.transaction_type === "issuance") {
          monthlyIssuance += amount;
        } else if (transaction.transaction_type === "spending") {
          monthlySpending += amount;
        } else if (transaction.transaction_type === "return") {
          monthlyReturned += amount;
        }
      }
    });

    // Get active agents count
    const supabase = createClient();
    const fetchAgentsCount = async () => {
      const { count: agentsCount } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Calculate monthly transaction stats for display in the table
      const monthlyTransactionCount = filtered.filter(
        (t) => t.status === "approved",
      ).length;

      setStats({
        totalAgents: agentsCount || 0,
        totalTransactions: monthlyTransactionCount,
        // These three values are NOT filtered by month (showing current totals)
        currentBalance: pepiBookBalance,
        cashOnHand: safeCashBalance,
        agentCashBalance: totalIssuedToAgents,
        // These values ARE filtered by month
        totalIssuance: monthlyIssuance,
        totalSpending: monthlySpending,
        totalReturned: monthlyReturned,
        spendingTotal: monthlySpending,
        activePepiBookYear: activePepiBook?.year || null,
        // Keep the old stats properties for backward compatibility
        safeCashBalance: safeCashBalance,
      });
    };

    fetchAgentsCount();
  }, [transactions, selectedMonth, selectedYear, activePepiBook]);

  // Use the formatCurrency utility function from utils.ts

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const printableReportRef = useRef<HTMLDivElement>(null);
  const cbMemoRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printableReportRef.current) {
      // Focus on the printable report and print it
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(
          "<html><head><title>Monthly Transaction Report</title>",
        );
        printWindow.document.write('<meta charset="UTF-8">');
        printWindow.document.write(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        );
        printWindow.document.write(
          '<link rel="stylesheet" href="/globals.css" type="text/css" media="print"/>',
        );
        printWindow.document.write("<style>");
        printWindow.document.write(`
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2; text-align: left; }
          .header { margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; font-size: 12px; }
          h1, h2, h3 { margin: 0; padding: 0; }
          .executive-summary { background-color: #f9f9f9; padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; }
          .financial-summary table { margin-bottom: 20px; }
          .signature-section { margin-top: 50px; }
          .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; }
          @page { size: letter; margin: 0.5in; }
        `);
        printWindow.document.write("</style>");
        printWindow.document.write("</head><body>");
        printWindow.document.write(printableReportRef.current.innerHTML);
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        // Fallback to standard print if window.open fails
        window.print();
      }
    } else {
      window.print();
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month];
  };

  const handlePrintCbMemo = () => {
    if (cbMemoRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write("<html><head><title>PEPI CB Memo</title>");
        printWindow.document.write('<meta charset="UTF-8">');
        printWindow.document.write(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        );
        printWindow.document.write(
          '<link href="https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap" rel="stylesheet">',
        );
        printWindow.document.write("<style>");
        printWindow.document.write(`
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            background: white;
            color: black;
          }
          
          @page { size: letter; margin: 1in; }
          
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
        `);
        printWindow.document.write("</style>");
        printWindow.document.write("</head><body>");

        // Generate the memo HTML directly
        const data = {
          commanderName: commanderName,
          memoDate: format(new Date(), "MMMM d, yyyy"),
          monthName: getMonthName(selectedMonth),
          bookYear: selectedYear.toString(),
          reconciliationDate: format(new Date(), "MMMM d, yyyy"),
          beginningBalance: stats.currentBalance,
          totalAgentIssues: stats.totalIssuance,
          totalAgentReturns: stats.totalReturned,
          cashOnHand: stats.cashOnHand,
          totalExpenditures: stats.spendingTotal,
          totalAdditionalUnitIssue: 0,
          endingBalance: stats.currentBalance,
          ytdExpenditures: totalSpentByAgents,
          initialFunding: activePepiBook?.starting_amount || 0,
          issuedToAgents: stats.totalIssuance,
          spentByAgents: stats.spendingTotal,
          returnedByAgents: stats.totalReturned,
          bookBalance: stats.cashOnHand,
        };

        const formatMoney = (amount) => {
          return amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        };

        const upperInitials = commanderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase();
        const lowerInitials = commanderName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toLowerCase();

        printWindow.document.write(`
          <div class="memo-container">
            <h1 class="memo-title">MEMORANDUM</h1>
            
            <div class="memo-header">
              <div class="memo-header-label">TO:</div>
              <div>PEPI Account File</div>
              
              <div class="memo-header-label">FROM:</div>
              <div>${data.commanderName}, Commander</div>
              
              <div class="memo-header-label">DATE:</div>
              <div>${data.memoDate}</div>
              
              <div class="memo-header-label">RE:</div>
              <div>PEPI for ${data.monthName} ${data.bookYear}</div>
              
              <div class="memo-cmans">CMANS</div>
            </div>
            
            <div class="memo-body">
              <p>
                On ${data.reconciliationDate}, the CMANS PEPI account was reconciled
                for the month of ${data.monthName} ${data.bookYear}.
              </p>
              <p>
                The current overall balance is ${formatMoney(data.beginningBalance)}.
                CMANS Agents were issued ${formatMoney(data.totalAgentIssues)} during ${data.monthName} ${data.bookYear}.
                Agents returned ${formatMoney(data.totalAgentReturns)} for the month of ${data.monthName} ${data.bookYear}.
                Cash on hand was counted and verified at ${formatMoney(data.cashOnHand)} (current balance).
                CMANS Agents expended ${formatMoney(data.totalExpenditures)} for ${data.monthName} ${data.bookYear}.
                ${data.totalAdditionalUnitIssue > 0 ? `Additional Unit issue of PEPI was ${formatMoney(data.totalAdditionalUnitIssue)}.` : ""}
                The CMANS PEPI balance at the end of ${data.monthName} was ${formatMoney(data.endingBalance)} (current balance).
                The total expenditures for ${data.bookYear} are ${formatMoney(data.ytdExpenditures)}.
              </p>
            </div>
            
            <div class="memo-totals">
              <h2 class="memo-totals-title">TOTALS</h2>
              <table class="memo-table">
                <tbody>
                  <tr>
                    <td>Initial Funding</td>
                    <td>
                      ${formatMoney(data.initialFunding)}
                      <span class="memo-label">(Overall)</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Issued To Agents</td>
                    <td>
                      ${formatMoney(data.issuedToAgents)}
                      <span class="memo-label">(${data.monthName})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Spent By Agents</td>
                    <td>
                      ${formatMoney(data.spentByAgents)}
                      <span class="memo-label">(${data.monthName})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total Returned By Agents</td>
                    <td>
                      ${formatMoney(data.returnedByAgents)}
                      <span class="memo-label">(${data.monthName})</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Book Balance (Safe Cash)</td>
                    <td>
                      ${formatMoney(data.bookBalance)}
                      <span class="memo-label">(Current)</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Cash with Agents</td>
                    <td>
                      ${formatMoney(stats.agentCashBalance || 0)}
                      <span class="memo-label">(Current)</span>
                    </td>
                  </tr>
                  ${
                    data.totalAdditionalUnitIssue > 0
                      ? `
                  <tr>
                    <td>Additional Unit Issue</td>
                    <td>
                      ${formatMoney(data.totalAdditionalUnitIssue)}
                      <span class="memo-label">(${data.monthName})</span>
                    </td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td>Expenditures CY ${data.bookYear}</td>
                    <td>
                      ${formatMoney(data.ytdExpenditures)}
                      <span class="memo-label">(Total)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="memo-footer">
              ${upperInitials}/${lowerInitials}
            </div>
          </div>
        `);

        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  const toggleCbMemo = () => {
    setShowCbMemo(!showCbMemo);
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header with month selector and print button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Monthly Transaction Report
            {activePepiBook && (
              <span className="text-sm font-normal ml-2 text-muted-foreground">
                PEPI Book: {activePepiBook.year}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mb-2">
            Note: Transaction list is filtered by month, but balance totals show
            current overall balances
          </p>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              disabled={loading}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {getMonthName(i)}
                </option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              disabled={loading}
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={toggleCbMemo}
            disabled={loading}
            variant="outline"
            className="print:hidden"
          >
            <FileText className="mr-2 h-4 w-4" />
            {showCbMemo ? "Hide CB Memo" : "Show CB Memo"}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={loading}
            className="print:hidden"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          {showCbMemo && (
            <Button
              onClick={handlePrintCbMemo}
              disabled={loading}
              className="print:hidden"
              variant="secondary"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print CB Memo
            </Button>
          )}
        </div>
      </div>

      {/* CB Memo Report (conditionally shown) */}
      {showCbMemo && (
        <div className="mb-6 border rounded-lg overflow-hidden">
          <div className="p-4" ref={cbMemoRef}>
            <CbMemoReport
              data={{
                commanderName: commanderName,
                memoDate: format(new Date(), "MMMM d, yyyy"),
                monthName: getMonthName(selectedMonth),
                bookYear: selectedYear.toString(),
                reconciliationDate: format(new Date(), "MMMM d, yyyy"),
                beginningBalance: stats.currentBalance, // Use current balance instead of starting amount
                totalAgentIssues: stats.totalIssuance,
                totalAgentReturns: stats.totalReturned,
                cashOnHand: stats.cashOnHand,
                totalExpenditures: stats.spendingTotal,
                totalAdditionalUnitIssue: 0, // You may need to calculate this
                endingBalance: stats.currentBalance,
                ytdExpenditures: totalSpentByAgents, // Use the total spent from all transactions
                initialFunding: activePepiBook?.starting_amount || 0,
                issuedToAgents: stats.totalIssuance,
                spentByAgents: stats.spendingTotal,
                returnedByAgents: stats.totalReturned,
                bookBalance: stats.cashOnHand,
                agentCashBalance: stats.agentCashBalance,
                cashWithAgents: stats.agentCashBalance || 0,
              }}
            />
          </div>
        </div>
      )}

      {/* Printable Report (hidden but used for printing) */}
      <div className="hidden" ref={printableReportRef}>
        <PrintableReport
          reportData={filteredTransactions}
          stats={{
            // Pass the actual stats object which contains both filtered monthly values
            // and current overall balances
            totalAgents: stats.totalAgents,
            totalTransactions: filteredTransactions.length,
            // Monthly filtered values
            totalIssuance: stats.totalIssuance,
            totalReturned: stats.totalReturned,
            spendingTotal: stats.spendingTotal,
            // Current overall balances (not filtered by month)
            currentBalance: stats.currentBalance,
            cashOnHand: stats.cashOnHand,
            agentCashBalance: stats.agentCashBalance,
            activePepiBookYear: activePepiBook?.year || null,
          }}
          startDate={new Date(selectedYear, selectedMonth, 1)}
          endDate={new Date(selectedYear, selectedMonth + 1, 0)}
          isMonthlyReport={true}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Loading report data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards - Using the same format as DashboardOverview */}
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Initial Funding
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(activePepiBook?.starting_amount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PEPI book starting amount
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Issued To Agents
                  </CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalIssuance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Funds issued in {getMonthName(selectedMonth)} {selectedYear}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Spent By Agents
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.spendingTotal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Spending in {getMonthName(selectedMonth)} {selectedYear}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Returned By Agents
                  </CardTitle>
                  <ArrowDownLeft className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalReturned)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Returns in {getMonthName(selectedMonth)} {selectedYear}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Book Balance (Safe Cash)
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.cashOnHand)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current remaining funds in PEPI Book (not filtered by month)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Agents
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAgents}</div>
                  <p className="text-xs text-muted-foreground">
                    Task force members
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Transaction Tabs */}
          <Tabs defaultValue="all" className="w-full print:hidden">
            <TabsList>
              <TabsTrigger value="all">All Transactions</TabsTrigger>
              <TabsTrigger value="issuance">Issuance</TabsTrigger>
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="return">Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <TransactionTable
                transactions={filteredTransactions}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </TabsContent>

            <TabsContent value="issuance" className="mt-4">
              <TransactionTable
                transactions={filteredTransactions.filter(
                  (t) => t.transaction_type === "issuance",
                )}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </TabsContent>

            <TabsContent value="spending" className="mt-4">
              <TransactionTable
                transactions={filteredTransactions.filter(
                  (t) => t.transaction_type === "spending",
                )}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </TabsContent>

            <TabsContent value="return" className="mt-4">
              <TransactionTable
                transactions={filteredTransactions.filter(
                  (t) => t.transaction_type === "return",
                )}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            </TabsContent>
          </Tabs>

          {/* Print version - shows all transactions */}
          <div className="hidden print:block mt-6">
            <h2 className="text-xl font-bold mb-4">All Transactions</h2>
            <TransactionTable
              transactions={filteredTransactions}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />

            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-bold mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="font-medium">
                    Total Issued ({getMonthName(selectedMonth)}):
                  </p>
                  <p>{formatCurrency(stats.totalIssuance)}</p>
                </div>
                <div>
                  <p className="font-medium">
                    Total Spent ({getMonthName(selectedMonth)}):
                  </p>
                  <p>{formatCurrency(stats.totalSpending)}</p>
                </div>
                <div>
                  <p className="font-medium">
                    Total Returned ({getMonthName(selectedMonth)}):
                  </p>
                  <p>{formatCurrency(stats.totalReturned)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="font-medium">Safe Cash Balance (Current):</p>
                  <p>{formatCurrency(stats.safeCashBalance)}</p>
                </div>
                <div>
                  <p className="font-medium">Agent Cash Balance (Current):</p>
                  <p>{formatCurrency(stats.agentCashBalance)}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8">
              <div className="flex justify-between">
                <div className="w-1/3 border-t pt-2">
                  <p className="text-center">Prepared By</p>
                </div>
                <div className="w-1/3 border-t pt-2">
                  <p className="text-center">Reviewed By</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TransactionTable({
  transactions,
  formatCurrency,
  formatDate,
}: {
  transactions: any[];
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}) {
  if (!transactions.length) {
    return (
      <div className="text-center py-8 bg-muted/20 rounded-md border">
        <p className="text-muted-foreground">
          No transactions found for the selected month
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="py-2 px-4 text-left">Date</th>
              <th className="py-2 px-4 text-left">Type</th>
              <th className="py-2 px-4 text-left">Amount</th>
              <th className="py-2 px-4 text-left">Agent</th>
              <th className="py-2 px-4 text-left">Receipt #</th>
              <th className="py-2 px-4 text-left">Description</th>
              <th className="py-2 px-4 text-left print:hidden">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b">
                <td className="py-2 px-4">
                  {formatDate(
                    transaction.transaction_date || transaction.created_at,
                  )}
                </td>
                <td className="py-2 px-4 capitalize">
                  {transaction.transaction_type}
                </td>
                <td className="py-2 px-4">
                  {formatCurrency(parseFloat(transaction.amount))}
                </td>
                <td className="py-2 px-4">
                  {transaction.agents
                    ? `${transaction.agents.name} ${transaction.agents.badge_number ? `(${transaction.agents.badge_number})` : ""}`
                    : "N/A"}
                </td>
                <td className="py-2 px-4">
                  {transaction.receipt_number || "N/A"}
                </td>
                <td className="py-2 px-4">
                  {transaction.description || "N/A"}
                </td>
                <td className="py-2 px-4 capitalize print:hidden">
                  {transaction.status || "approved"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
