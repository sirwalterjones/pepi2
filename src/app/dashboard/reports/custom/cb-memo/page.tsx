"use client";

import React, { useState, useEffect } from "react";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { createClient } from "../../../../../utils/supabase-client";
import {
  getMonthlyPepiMemoDataAction,
  MonthlyPepiMemoData,
  getAgentsForSelectAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Printer, CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import MonthlyPepiMemo from "@/components/reports/MonthlyPepiMemo";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Define type for fetched admin agents
type AdminAgent = { user_id: string; name: string };

export default function CbMemoReportPage() {
  const { activeBook } = usePepiBooks();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [memoData, setMemoData] = useState<MonthlyPepiMemoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<
    { value: number; label: string }[]
  >([]);

  // State for new controls
  const [adminAgents, setAdminAgents] = useState<AdminAgent[]>([]);
  const [selectedCommanderName, setSelectedCommanderName] = useState<
    string | null
  >(null);
  const [selectedMemoDate, setSelectedMemoDate] = useState<Date | undefined>(
    new Date(),
  ); // Default to today

  // Fetch admin agents
  useEffect(() => {
    const fetchAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const result = await getAgentsForSelectAction();
        if (result.success && result.data) {
          // Assuming the action fetches ALL agents, filter for admins if necessary
          // If the action only returns admins, this filter is redundant
          // const admins = result.data.filter(agent => agent.role === 'admin');
          setAdminAgents(result.data || []);
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load list of commanders.",
          });
          setAdminAgents([]);
        }
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load list of commanders.",
        });
        setAdminAgents([]);
      } finally {
        setLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, [toast]);

  useEffect(() => {
    // Populate available months when active book changes
    if (activeBook) {
      const months = [];
      const year = activeBook.year; // Assuming year is directly available
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; // 1-12

      for (let i = 1; i <= 12; i++) {
        // Only allow selecting months up to the current month if it's the current year
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
      // Reset selection if book changes
      setSelectedMonth(null);
      setMemoData(null);
      setError(null);
    } else {
      setAvailableMonths([]);
      setSelectedMonth(null);
      setMemoData(null);
      setError(null);
    }
  }, [activeBook]);

  const handleGenerateMemo = async () => {
    if (
      !activeBook ||
      selectedMonth === null ||
      !selectedCommanderName ||
      !selectedMemoDate
    ) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select Book, Month, Commander, and Memo Date.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setMemoData(null);

    try {
      // First, get the monthly filtered transactions to calculate the correct monthly totals
      const supabase = createClient();
      const firstDayOfMonth = new Date(activeBook.year, selectedMonth - 1, 1);
      const lastDayOfMonth = new Date(activeBook.year, selectedMonth, 0);

      // Format dates for query
      const formattedFirstDay = firstDayOfMonth.toISOString();
      const formattedLastDay = lastDayOfMonth.toISOString();

      // Get transactions for the selected month
      const { data: monthlyTransactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .or(
          `transaction_date.gte.${formattedFirstDay},transaction_date.lte.${formattedLastDay},and(created_at.gte.${formattedFirstDay},created_at.lte.${formattedLastDay})`,
        )
        .order("created_at", { ascending: true });

      if (txError) {
        throw new Error(`Error fetching transactions: ${txError.message}`);
      }

      // Calculate monthly totals from the filtered transactions
      let monthlyIssuance = 0;
      let monthlySpending = 0;
      let monthlyReturned = 0;
      let monthlyAgentIssues = 0;
      let monthlyInitialFunding = 0;
      let monthlyAdditionalUnitIssue = 0;

      // Also calculate current balances (not filtered by month)
      let totalIssuedToAgents = 0;
      let totalSpentByAgents = 0;
      let totalReturnedByAgents = 0;
      let totalAddedToBook = 0;
      let initialAmount = activeBook?.starting_amount || 0;

      // Get all transactions for current balances
      const { data: allTransactions } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: true });

      // Process all transactions to calculate current balances
      allTransactions?.forEach((transaction) => {
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
      let pepiBookBalance =
        initialAmount + totalAddedToBook - totalSpentByAgents;

      // Calculate safe cash: current balance - what's issued to agents
      let safeCashBalance = pepiBookBalance - totalIssuedToAgents;

      // Process filtered transactions to calculate monthly stats
      monthlyTransactions?.forEach((tx) => {
        if (tx.status === "approved") {
          const amount = parseFloat(tx.amount.toString());

          if (tx.transaction_type === "issuance") {
            monthlyIssuance += amount;
            if (tx.agent_id) {
              monthlyAgentIssues += amount;
            } else if (tx.receipt_number?.startsWith("ADD")) {
              // Count additions to the book in the selected month
              monthlyAdditionalUnitIssue += amount;
              monthlyInitialFunding += amount;
            }
          } else if (tx.transaction_type === "spending") {
            monthlySpending += amount;
          } else if (tx.transaction_type === "return") {
            monthlyReturned += amount;
          }
        }
      });

      // Pass selected commander name and memo date (as ISO string)
      const result = await getMonthlyPepiMemoDataAction(
        activeBook.id,
        selectedMonth,
        selectedCommanderName,
        selectedMemoDate.toISOString(),
      );

      if (result.success && result.data) {
        // Override the monthly values with our calculated values from filtered transactions
        const enhancedData = {
          ...result.data,
          // Use our calculated monthly values
          monthlyIssuedToAgents: monthlyAgentIssues,
          monthlySpentByAgents: monthlySpending,
          monthlyReturnedByAgents: monthlyReturned,
          monthlyAgentIssues: monthlyAgentIssues,
          monthlyExpenditures: monthlySpending,
          monthlyAgentReturns: monthlyReturned,
          monthlyInitialFunding: monthlyInitialFunding,
          monthlyAdditionalUnitIssue: monthlyAdditionalUnitIssue,
          // For the memo, use monthly values for the main display
          totalAgentIssues: monthlyAgentIssues,
          totalAgentReturns: monthlyReturned,
          totalExpenditures: monthlySpending,
          totalAdditionalUnitIssue: monthlyAdditionalUnitIssue,
          initialFunding: monthlyInitialFunding,
          // Current balances (not filtered by month)
          currentBalance: pepiBookBalance,
          cashOnHand: safeCashBalance,
          agentCashBalance: totalIssuedToAgents,
          endingBalance: pepiBookBalance,
          // Add flags to indicate which values are filtered by month vs. current totals
          isMonthlyFiltered: true,
          selectedMonth: selectedMonth,
          selectedYear: activeBook.year,
        };
        setMemoData(enhancedData);
      } else {
        setError(result.error || "Failed to generate memo data.");
        toast({
          variant: "destructive",
          title: "Error Generating Memo",
          description: result.error,
        });
      }
    } catch (err: any) {
      setError("An unexpected error occurred while generating the memo.");
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
    if (memoData) {
      // Add a class to the body or a wrapper div to control print styles via CSS
      document.body.classList.add("printing-memo");
      window.print();
      // Remove class after print dialog is likely closed
      setTimeout(() => document.body.classList.remove("printing-memo"), 500);
    } else {
      toast({
        title: "Cannot Print",
        description: "Please generate a memo first.",
      });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Wrap title and controls in a div to hide on print */}
      <div className="hide-on-print">
        <h1 className="text-2xl font-semibold">
          Monthly PEPI Reconciliation Memo (CB Memo)
        </h1>

        {!activeBook ? (
          <p className="text-muted-foreground mt-4">
            Please select an active PEPI Book first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-end gap-4 mt-4">
            {/* Month Select */}
            <div className="flex-col">
              <label
                htmlFor="month-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Month
              </label>
              <Select
                value={selectedMonth !== null ? String(selectedMonth) : ""}
                onValueChange={(value) =>
                  setSelectedMonth(value ? Number(value) : null)
                }
                disabled={loading}
              >
                <SelectTrigger id="month-select">
                  <SelectValue placeholder="Select a month..." />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                  {availableMonths.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">
                      No months available for this book yet.
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Commander Select */}
            <div className="flex-col">
              <label
                htmlFor="commander-select"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Commander
              </label>
              <Select
                value={selectedCommanderName || ""}
                onValueChange={(value) =>
                  setSelectedCommanderName(value || null)
                }
                disabled={loading || loadingAdmins}
              >
                <SelectTrigger id="commander-select">
                  <SelectValue
                    placeholder={
                      loadingAdmins ? "Loading..." : "Select commander..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {adminAgents.map((agent) => (
                    <SelectItem key={agent.user_id} value={agent.name}>
                      {agent.name}
                    </SelectItem>
                  ))}
                  {adminAgents.length === 0 && !loadingAdmins && (
                    <p className="p-4 text-sm text-muted-foreground">
                      No commanders found.
                    </p>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="flex-col">
              <label
                htmlFor="memo-date-picker"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Memo Date
              </label>
              <Popover>
                <PopoverTrigger asChild id="memo-date-picker">
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedMemoDate && "text-muted-foreground",
                    )}
                    disabled={loading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedMemoDate ? (
                      format(selectedMemoDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedMemoDate}
                    onSelect={setSelectedMemoDate}
                    initialFocus
                    disabled={(date) => date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 lg:col-start-4 justify-end">
              <Button
                onClick={handleGenerateMemo}
                disabled={
                  loading ||
                  !selectedMonth ||
                  !selectedCommanderName ||
                  !selectedMemoDate
                }
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Generate Memo
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={loading || !memoData}
                className="w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Memo
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* End of hide-on-print section */}

      {error && (
        <p className="text-red-600 hide-on-print">Error: {error}</p> // Also hide error messages on print
      )}

      {/* Memo Display Area */}
      <div
        id="memo-content-area"
        className="mt-6 border rounded-lg p-4 bg-white print:border-none print:shadow-none print:p-0"
      >
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3">Generating memo data...</span>
          </div>
        )}
        {!loading && !memoData && !error && (
          <p className="text-center text-muted-foreground py-10">
            Select a month and click "Generate Memo" to view the report.
          </p>
        )}
        {memoData && <MonthlyPepiMemo data={memoData} />}
      </div>

      {/* Print-specific styles (can be moved to global CSS or a layout component later) */}
      <style jsx global>{`
        @media print {
          body.printing-memo {
            margin: 0;
            padding: 0;
          }
          body.printing-memo .hide-on-print {
            display: none;
          }
          body.printing-memo #memo-content-area {
            display: block;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none;
            box-shadow: none;
            background-color: transparent;
          }
          /* Add any other print-specific overrides here */
        }
      `}</style>
    </div>
  );
}
