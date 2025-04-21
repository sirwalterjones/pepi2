"use client";

import { useState, useEffect, useRef } from "react";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DatePicker } from "../ui/date-picker";
import { useAgents } from "@/hooks/useAgents";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { TransactionType } from "@/types/schema";
import {
  Download,
  FileText,
  Loader2,
  Info,
  Printer,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "../ui/badge";
import PrintableReport from "./PrintableReport";

interface ReportGeneratorProps {
  initialReportType?: "custom" | "monthly";
}

export default function ReportGenerator({
  initialReportType = "custom",
}: ReportGeneratorProps) {
  const [reportType, setReportType] = useState<"custom" | "monthly">(
    initialReportType,
  );
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [agentId, setAgentId] = useState<string>("all");
  const [transactionType, setTransactionType] = useState<string>("all");
  const [transactionStatus, setTransactionStatus] = useState<string>("all");
  const [reportFormat, setReportFormat] = useState<"csv" | "pdf">("csv");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [pepiBookId, setPepiBookId] = useState<string>("all");
  const [showPrintable, setShowPrintable] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalAgents: 0,
    totalTransactions: 0,
    totalIssuance: 0,
    totalReturned: 0,
    currentBalance: 0,
    cashOnHand: 0,
    spendingTotal: 0,
    activePepiBookYear: null as number | null,
  });
  const { agents } = useAgents();
  const { pepiBooks, activeBook } = usePepiBooks();
  const supabase = createClient();

  useEffect(() => {
    // Auto-generate report when component mounts if we're on the view tab
    if (activeBook) {
      // Add a small delay to ensure all components are mounted
      const timer = setTimeout(() => {
        if (reportType === "monthly") {
          generateMonthlyReport();
        } else {
          generateReport();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reportType, activeBook]);

  const generateReport = async () => {
    setIsGenerating(true);
    setReportData(null);

    try {
      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          agents:agent_id (id, name, badge_number, is_active)
        `,
        )
        .order("created_at", { ascending: false });

      // Apply filters
      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        // Add one day to include the end date fully
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt("created_at", nextDay.toISOString());
      }

      if (agentId && agentId !== "all") {
        query = query.eq("agent_id", agentId);
      }

      if (transactionType !== "all") {
        query = query.eq("transaction_type", transactionType);
      }

      if (pepiBookId !== "all") {
        query = query.eq("pepi_book_id", pepiBookId);
      }

      if (transactionStatus !== "all") {
        query = query.eq("status", transactionStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error generating report:", error);
        setReportData([]);
        return;
      }

      // Filter out transactions from deactivated agents
      const filteredData = (data || []).filter((transaction) => {
        // If there's no agent, keep the transaction
        if (!transaction.agents) return true;
        // Only keep transactions from active agents
        return transaction.agents.is_active !== false;
      });

      setReportData(filteredData);

      // Calculate dashboard stats
      const { agentsCount } = await fetchAgentsCount();
      const stats = calculateDashboardStats(filteredData, agentsCount);
      setDashboardStats(stats);
    } catch (error) {
      console.error("Error generating report:", error);
      setReportData([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMonthlyReport = async () => {
    setIsGenerating(true);
    setReportData(null);

    // Set date range to current month
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    setStartDate(currentMonthStart);
    setEndDate(currentMonthEnd);

    try {
      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          agents:agent_id (id, name, badge_number, is_active)
        `,
        )
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString())
        .order("created_at", { ascending: false });

      if (pepiBookId !== "all") {
        query = query.eq("pepi_book_id", pepiBookId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error generating monthly report:", error);
        setReportData([]);
        return;
      }

      // Filter out transactions from deactivated agents
      const filteredData = (data || []).filter((transaction) => {
        // If there's no agent, keep the transaction
        if (!transaction.agents) return true;
        // Only keep transactions from active agents
        return transaction.agents.is_active !== false;
      });

      setReportData(filteredData);

      // Calculate dashboard stats
      const { agentsCount } = await fetchAgentsCount();
      const stats = calculateDashboardStats(filteredData, agentsCount);
      setDashboardStats(stats);
    } catch (error) {
      console.error("Error generating monthly report:", error);
      setReportData([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchAgentsCount = async () => {
    try {
      const { count: agentsCount, error: agentsError } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (agentsError) {
        console.error("Error fetching agents count:", agentsError);
        return { agentsCount: 0 };
      }

      return { agentsCount: agentsCount || 0 };
    } catch (error) {
      console.error("Error fetching agents count:", error);
      return { agentsCount: 0 };
    }
  };

  const calculateDashboardStats = (
    transactions: any[],
    agentsCount: number,
  ) => {
    let issuanceTotal = 0;
    let returnedTotal = 0;
    let spendingTotal = 0;

    // Find initial funding transaction
    const initialFundingTransaction = transactions?.find(
      (transaction) =>
        transaction.transaction_type === "issuance" &&
        transaction.description?.toLowerCase().includes("initial funding"),
    );

    transactions?.forEach((transaction) => {
      if (
        (transaction.status === "approved" ||
          transaction.status === "pending") &&
        // Skip the initial funding transaction when calculating issuance total
        transaction.id !== initialFundingTransaction?.id
      ) {
        if (transaction.transaction_type === "issuance") {
          issuanceTotal += parseFloat(transaction.amount);
        } else if (transaction.transaction_type === "return") {
          returnedTotal += parseFloat(transaction.amount);
        } else if (transaction.transaction_type === "spending") {
          spendingTotal += parseFloat(transaction.amount);
        }
      }
    });

    // Initial funding is the starting amount from the PEPI book
    const initialFunding = activeBook?.starting_amount || 0;

    // Cash on hand is the initial funding minus what's been spent
    const cashOnHand = initialFunding - spendingTotal;

    // Current balance is the initial funding minus what's been spent
    const currentBalance = initialFunding - spendingTotal;

    return {
      totalAgents: agentsCount,
      totalTransactions: transactions?.length || 0,
      totalIssuance: issuanceTotal,
      totalReturned: returnedTotal,
      currentBalance: currentBalance,
      cashOnHand: cashOnHand,
      spendingTotal: spendingTotal,
      activePepiBookYear: activeBook?.year || null,
    };
  };

  const downloadReport = () => {
    if (!reportData) return;

    if (reportFormat === "csv") {
      // Generate CSV
      const headers = [
        "Transaction ID",
        "Type",
        "Amount",
        "Date",
        "Receipt Number",
        "Description",
        "Agent",
        "Status",
      ];

      const csvRows = [
        headers.join(","),
        ...reportData.map((row) => {
          const agent = row.agents
            ? `${row.agents.name} (${row.agents.badge_number || "No Badge"})`
            : "N/A";
          return [
            row.id,
            row.transaction_type,
            row.amount,
            new Date(row.created_at).toLocaleDateString(),
            row.receipt_number || "N/A",
            `"${(row.description || "").replace(/"/g, '""')}"`,
            `"${agent}"`,
            row.status || "approved",
          ].join(",");
        }),
      ];

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `pepi-transactions-report-${format(new Date(), "yyyy-MM-dd")}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For PDF, we'd typically use a library like jsPDF or pdfmake
      // This is a simplified placeholder
      alert("PDF export functionality will be implemented with a PDF library");
    }
  };

  const handlePrint = () => {
    setShowPrintable(true);
    setTimeout(() => {
      window.print();
      // Keep the printable view visible for a moment after printing
      setTimeout(() => setShowPrintable(false), 500);
    }, 300);
  };

  const calculateTotals = () => {
    if (!reportData)
      return { issuance: 0, spending: 0, returned: 0, balance: 0 };

    let issuance = 0;
    let spending = 0;
    let returned = 0;

    reportData.forEach((transaction) => {
      if (transaction.transaction_type === "issuance") {
        issuance += parseFloat(transaction.amount);
      } else if (transaction.transaction_type === "spending") {
        spending += parseFloat(transaction.amount);
      } else if (transaction.transaction_type === "return") {
        returned += parseFloat(transaction.amount);
      }
    });

    const balance = issuance - spending - returned;

    return { issuance, spending, returned, balance };
  };

  const totals = calculateTotals();

  // Set active PEPI book as default when component loads
  useEffect(() => {
    if (activeBook) {
      setPepiBookId(activeBook.id);
    }
  }, [activeBook]);

  return (
    <Tabs defaultValue="generate" className="w-full">
      <TabsList className="grid w-full md:w-[400px] grid-cols-2">
        <TabsTrigger value="generate">Generate Report</TabsTrigger>
        <TabsTrigger value="view" disabled={!reportData}>
          View Results
        </TabsTrigger>
      </TabsList>

      {activeBook && (
        <div className="flex items-center gap-2 mt-2 mb-4 text-sm bg-muted/50 p-2 rounded-md">
          <Info className="h-4 w-4 text-blue-500" />
          <span>Active PEPI Book:</span>
          <Badge variant="outline" className="font-medium">
            {activeBook.year} {activeBook.is_closed ? "(Closed)" : ""}
          </Badge>
        </div>
      )}

      <TabsContent value="generate" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Parameters</CardTitle>
            <CardDescription>
              Select filters to generate a custom transaction report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <div className="flex gap-4">
                  <Button
                    variant={reportType === "custom" ? "default" : "outline"}
                    onClick={() => setReportType("custom")}
                    type="button"
                  >
                    Custom Date Range
                  </Button>
                  <Button
                    variant={reportType === "monthly" ? "default" : "outline"}
                    onClick={() => setReportType("monthly")}
                    type="button"
                  >
                    Current Month
                  </Button>
                </div>
              </div>
            </div>

            {reportType === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <DatePicker
                    id="start-date"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <DatePicker
                    id="end-date"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent">Agent</Label>
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger id="agent">
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}{" "}
                          {agent.badge_number ? `(${agent.badge_number})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={setTransactionType}
                  >
                    <SelectTrigger id="transaction-type">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="issuance">Issuance</SelectItem>
                      <SelectItem value="spending">Spending</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pepi-book">PEPI Book</Label>
                  <Select value={pepiBookId} onValueChange={setPepiBookId}>
                    <SelectTrigger id="pepi-book">
                      <SelectValue placeholder="Select PEPI Book" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All PEPI Books</SelectItem>
                      {pepiBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.year} {book.is_active ? "(Active)" : ""}
                          {book.is_closed ? "(Closed)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transaction-status">Transaction Status</Label>
                  <Select
                    value={transactionStatus}
                    onValueChange={setTransactionStatus}
                  >
                    <SelectTrigger id="transaction-status">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-format">Report Format</Label>
                  <Select
                    value={reportFormat}
                    onValueChange={(value) =>
                      setReportFormat(value as "csv" | "pdf")
                    }
                  >
                    <SelectTrigger id="report-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {reportType === "monthly" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pepi-book-monthly">PEPI Book</Label>
                  <Select value={pepiBookId} onValueChange={setPepiBookId}>
                    <SelectTrigger id="pepi-book-monthly">
                      <SelectValue placeholder="Select PEPI Book" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All PEPI Books</SelectItem>
                      {pepiBooks.map((book) => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.year} {book.is_active ? "(Active)" : ""}
                          {book.is_closed ? "(Closed)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-format-monthly">Report Format</Label>
                  <Select
                    value={reportFormat}
                    onValueChange={(value) =>
                      setReportFormat(value as "csv" | "pdf")
                    }
                  >
                    <SelectTrigger id="report-format-monthly">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={
                reportType === "monthly"
                  ? generateMonthlyReport
                  : generateReport
              }
              disabled={
                isGenerating ||
                (reportType === "custom" && (!startDate || !endDate))
              }
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="view" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Results</CardTitle>
            <CardDescription>
              {reportData?.length} transactions found matching your criteria.
              {reportType === "monthly" && (
                <span className="block mt-1">
                  Period: {format(startDate || new Date(), "MMMM yyyy")}
                </span>
              )}
              {pepiBookId !== "all" &&
                pepiBooks.find((b) => b.id === pepiBookId) && (
                  <span className="block mt-1">
                    PEPI Book:{" "}
                    {pepiBooks.find((b) => b.id === pepiBookId)?.year}
                  </span>
                )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Initial Funding
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${(activeBook?.starting_amount || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total PEPI book funds
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Funds Issued
                  </CardTitle>
                  <ArrowUpRight className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardStats.totalIssuance.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Funds issued to agents
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Funds Spent
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardStats.spendingTotal.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Funds spent by agents
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cash On Hand
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardStats.cashOnHand.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Initial funds minus spent
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Balance
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${dashboardStats.currentBalance.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Initial funding amount
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
                  <div className="text-2xl font-bold">
                    {dashboardStats.totalAgents}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Task force members
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Agent</th>
                      <th className="px-4 py-3 text-left font-medium">
                        Receipt #
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData?.map((transaction) => (
                      <tr key={transaction.id} className="border-b">
                        <td className="px-4 py-3">
                          {new Date(
                            transaction.created_at,
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {transaction.transaction_type}
                        </td>
                        <td className="px-4 py-3">
                          ${parseFloat(transaction.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {transaction.agents
                            ? `${transaction.agents.name} ${transaction.agents.badge_number ? `(${transaction.agents.badge_number})` : ""}`
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {transaction.receipt_number || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          {transaction.description || "N/A"}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {transaction.status || "approved"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button onClick={downloadReport} disabled={!reportData}>
              <Download className="mr-2 h-4 w-4" />
              Download {reportFormat.toUpperCase()}
            </Button>
            <Button
              onClick={handlePrint}
              disabled={!reportData}
              variant="outline"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </CardFooter>
        </Card>

        {showPrintable && (
          <div
            className="fixed inset-0 bg-white z-50 overflow-auto print-only"
            ref={printableRef}
            style={{ display: "none" }}
          >
            <PrintableReport
              reportData={reportData}
              stats={dashboardStats}
              startDate={startDate}
              endDate={endDate}
              isMonthlyReport={reportType === "monthly"}
            />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
