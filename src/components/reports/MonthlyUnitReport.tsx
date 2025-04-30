"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import {
  getMonthlyUnitReportAction,
  MonthlyUnitReportTransaction,
  MonthlyUnitReportTotals,
  MonthlyUnitReportData, // Import the combined type
} from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Printer } from "lucide-react"; // Add Printer icon
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table"; // Import Table components

export default function MonthlyUnitReport() {
  const { activeBook } = usePepiBooks();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  // State now holds the combined data object
  const [reportData, setReportData] = useState<MonthlyUnitReportData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<
    { value: number; label: string }[]
  >([]);

  // Populate available months based on active book
  useEffect(() => {
    if (activeBook) {
      const months = [];
      const year = activeBook.year;
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      for (let i = 1; i <= 12; i++) {
        if (year < currentYear || (year === currentYear && i <= currentMonth)) {
          const monthDate = new Date(Date.UTC(year, i - 1, 1));
          const monthLabel = monthDate.toLocaleString("default", {
            month: "long",
            timeZone: "UTC",
          });
          months.push({ value: i, label: `${monthLabel} ${year}` });
        }
      }
      setAvailableMonths(months);
      setSelectedMonth(null); // Reset selection when book changes
      setReportData(null);
      setError(null);
    } else {
      setAvailableMonths([]);
      setSelectedMonth(null);
      setReportData(null);
      setError(null);
    }
  }, [activeBook]);

  const handleFetchReport = async () => {
    if (!activeBook || selectedMonth === null) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a month.",
      });
      return;
    }
    setLoading(true);
    setError(null);
    setReportData(null); // Reset combined data
    try {
      const result = await getMonthlyUnitReportAction(
        activeBook.id,
        selectedMonth,
      );
      if (result.success && result.data) {
        setReportData(result.data); // Set the combined data object
      } else {
        setError(result.error || "Failed to fetch report data.");
        toast({
          variant: "destructive",
          title: "Error Fetching Report",
          description: result.error,
        });
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    document.body.classList.add("printing-unit-report");
    window.print();
    setTimeout(
      () => document.body.classList.remove("printing-unit-report"),
      500,
    );
  };

  const renderTotals = (totals: MonthlyUnitReportTotals) => (
    <div className="mb-6 p-4 border rounded-lg bg-muted/40">
      <h3 className="text-lg font-semibold mb-3">Monthly Totals</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="font-medium">Agent Issues:</dt>
        <dd className="text-right">
          {formatCurrency(totals.totalAgentIssues)}
        </dd>
        <dt className="font-medium">Agent Returns:</dt>
        <dd className="text-right">
          {formatCurrency(totals.totalAgentReturns)}
        </dd>
        <dt className="font-medium">Expenditures:</dt>
        <dd className="text-right">
          {formatCurrency(totals.totalExpenditures)}
        </dd>
        <dt className="font-medium">Additional Funds Added:</dt>
        <dd className="text-right">
          {formatCurrency(totals.totalAdditionalUnitIssue)}
        </dd>
      </dl>
    </div>
  );

  const renderTransactionTable = (
    transactions: MonthlyUnitReportTransaction[],
  ) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Receipt #</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No transactions found for this month.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx) => {
              let typeVariant:
                | "default"
                | "secondary"
                | "destructive"
                | "outline" = "outline";
              if (tx.transaction_type === "issuance") typeVariant = "default";
              if (tx.transaction_type === "spending")
                typeVariant = "destructive";
              if (tx.transaction_type === "return") typeVariant = "secondary";
              const statusVariant =
                tx.status === "approved" ? "default" : "secondary";

              return (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(
                      new Date(tx.transaction_date || tx.created_at),
                      "P p",
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariant} className="capitalize">
                      {tx.transaction_type?.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tx.amount)}
                  </TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell>{tx.agent_name || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant} className="capitalize">
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{tx.receipt_number}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4 report-card-container">
      {/* Controls Section - hidden via class */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 hide-on-print">
        <div className="w-full sm:w-auto sm:min-w-[200px]">
          <Select
            value={selectedMonth !== null ? String(selectedMonth) : ""}
            onValueChange={(value) =>
              setSelectedMonth(value ? Number(value) : null)
            }
          >
            <SelectTrigger id="month-select-unit">
              <SelectValue placeholder="Select month..." />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
              {availableMonths.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  Select active book first.
                </p>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleFetchReport}
          disabled={loading || !selectedMonth}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Report
        </Button>
        {/* Show Print button only when data is loaded */}
        {reportData && (
          <Button variant="outline" onClick={handlePrint} disabled={loading}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        )}
      </div>

      {/* Error Display - hidden via class */}
      {error && <p className="text-red-600 hide-on-print">Error: {error}</p>}

      {/* Loading Indicator - hidden via class (implicitly by parent or add class if needed) */}
      {loading && (
        <div className="flex justify-center items-center py-10 hide-on-print">
          {" "}
          {/* Added hide-on-print */}
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3">Generating report...</span>
        </div>
      )}

      {/* Report Display Area */}
      {!loading && !error && reportData && (
        <div id="unit-report-content-area">
          {renderTotals(reportData.totals)}
          {renderTransactionTable(reportData.transactions)}
        </div>
      )}
      {/* Initial placeholder - hidden via class */}
      {!loading && !error && !reportData && selectedMonth === null && (
        <p className="text-muted-foreground hide-on-print">
          Select a month and generate the report.
        </p>
      )}

      {/* Simplified Print Styles */}
      <style jsx global>{`
        @media print {
          body.printing-unit-report {
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide elements specifically marked */
          body.printing-unit-report .hide-on-print {
            display: none !important;
          }
          /* Ensure the report content area is displayed and takes space */
          body.printing-unit-report #unit-report-content-area {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important; /* No extra padding needed if parents handled */
            width: 100% !important;
          }
          /* Remove Vercel toolbar */
          body.printing-unit-report [data-vercel-toolbar] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
