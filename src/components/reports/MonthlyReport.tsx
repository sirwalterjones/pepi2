"use client";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  startOfMonth,
  endOfMonth,
  format,
  subMonths,
  addMonths,
} from "date-fns";
import PrintableReport from "./PrintableReport";
import { ChevronLeft, ChevronRight, Printer, Loader2 } from "lucide-react";

export default function MonthlyReport() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [filteredData, setFilteredData] = useState<any[] | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalTransactions: 0,
    totalIssuance: 0,
    totalReturned: 0,
    currentBalance: 0,
    cashOnHand: 0,
    spendingTotal: 0,
    activePepiBookYear: null as number | null,
    safeCashBalance: 0,
    agentCashOnHand: 0,
  });
  const [isPrinting, setIsPrinting] = useState(false);

  // Get the current month's start and end dates based on selected month
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);

  const fetchMonthlyData = async () => {
    setLoading(true);
    const supabase = createClientComponentClient<Database>();

    try {
      // Get all transactions without filtering
      const { data: allTransactions, error } = await supabase
        .from("transactions")
        .select("*, agents(id, name, badge_number)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }

      console.log(
        `Total transactions in database: ${allTransactions?.length || 0}`,
      );

      // Always set reportData to all transactions - we'll display all by default
      setReportData(allTransactions || []);

      if (error) throw error;

      // Fetch active agents count
      const { count: agentsCount, error: agentsError } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (agentsError) throw agentsError;

      // Fetch active PEPI book
      const { data: pepiBooks, error: pepiBooksError } = await supabase
        .from("pepi_books")
        .select("*")
        .eq("is_active", true)
        .single();

      if (pepiBooksError && pepiBooksError.code !== "PGRST116") {
        throw pepiBooksError;
      }

      // Calculate statistics
      let totalIssuance = 0;
      let totalReturned = 0;
      let spendingTotal = 0;
      let safeCashBalance = 0;
      let agentCashOnHand = 0;

      transactions?.forEach((transaction) => {
        if (transaction.status === "approved") {
          if (transaction.transaction_type === "issuance") {
            totalIssuance += parseFloat(transaction.amount);
            // If issued to an agent, increase agent cash on hand
            if (transaction.agent_id) {
              agentCashOnHand += parseFloat(transaction.amount);
            } else {
              // If not issued to an agent, it's added to safe cash
              safeCashBalance += parseFloat(transaction.amount);
            }
          } else if (transaction.transaction_type === "return") {
            totalReturned += parseFloat(transaction.amount);
            // Returns decrease agent cash on hand and increase safe cash
            if (transaction.agent_id) {
              agentCashOnHand -= parseFloat(transaction.amount);
              safeCashBalance += parseFloat(transaction.amount);
            }
          } else if (transaction.transaction_type === "spending") {
            spendingTotal += parseFloat(transaction.amount);
            // Spending decreases agent cash on hand
            if (transaction.agent_id) {
              agentCashOnHand -= parseFloat(transaction.amount);
            } else {
              // If spent directly from safe, decrease safe cash
              safeCashBalance -= parseFloat(transaction.amount);
            }
          }
        }
      });

      const currentBalance = totalIssuance - totalReturned - spendingTotal;
      const cashOnHand = totalIssuance - spendingTotal - totalReturned;

      setReportData(transactions || []);
      setStats({
        totalAgents: agentsCount || 0,
        totalTransactions: transactions?.length || 0,
        totalIssuance,
        totalReturned,
        currentBalance,
        cashOnHand,
        spendingTotal,
        activePepiBookYear: pepiBooks?.year || null,
        safeCashBalance,
        agentCashOnHand,
      });
    } catch (error) {
      console.error("Error fetching monthly report data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyData();
  }, []);

  // Filter transactions whenever month/year selection changes
  useEffect(() => {
    if (!reportData) return;

    const filtered = reportData.filter((transaction) => {
      try {
        // Use transaction_date if available, otherwise fall back to created_at
        const dateToUse =
          transaction.transaction_date || transaction.created_at;
        if (!dateToUse) return false;

        const transactionDate = new Date(dateToUse);
        if (isNaN(transactionDate.getTime())) return false;

        return (
          transactionDate.getMonth() === selectedMonth &&
          transactionDate.getFullYear() === selectedYear
        );
      } catch (e) {
        return false;
      }
    });

    setFilteredData(filtered);

    // Calculate statistics based on filtered data
    let totalIssuance = 0;
    let totalReturned = 0;
    let spendingTotal = 0;
    let safeCashBalance = 0;
    let agentCashOnHand = 0;

    filtered.forEach((transaction) => {
      if (transaction.status === "approved") {
        if (transaction.transaction_type === "issuance") {
          totalIssuance += parseFloat(transaction.amount);
          if (transaction.agent_id) {
            agentCashOnHand += parseFloat(transaction.amount);
          } else {
            safeCashBalance += parseFloat(transaction.amount);
          }
        } else if (transaction.transaction_type === "return") {
          totalReturned += parseFloat(transaction.amount);
          if (transaction.agent_id) {
            agentCashOnHand -= parseFloat(transaction.amount);
            safeCashBalance += parseFloat(transaction.amount);
          }
        } else if (transaction.transaction_type === "spending") {
          spendingTotal += parseFloat(transaction.amount);
          if (transaction.agent_id) {
            agentCashOnHand -= parseFloat(transaction.amount);
          } else {
            safeCashBalance -= parseFloat(transaction.amount);
          }
        }
      }
    });

    const currentBalance = totalIssuance - totalReturned - spendingTotal;
    const cashOnHand = totalIssuance - spendingTotal - totalReturned;

    setStats((prev) => ({
      ...prev,
      totalTransactions: filtered.length,
      totalIssuance,
      totalReturned,
      currentBalance,
      cashOnHand,
      spendingTotal,
      safeCashBalance,
      agentCashOnHand,
    }));
  }, [reportData, selectedMonth, selectedYear]);

  const handlePrint = () => {
    setIsPrinting(true);
    // Use a longer timeout to ensure the content is fully rendered
    setTimeout(() => {
      window.print();
      // Set isPrinting back to false after printing is complete
      setTimeout(() => setIsPrinting(false), 500);
    }, 300);
  };

  const handlePreviousMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentDate, 1);
    if (nextMonth <= new Date()) {
      setCurrentDate(nextMonth);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Monthly Report</h1>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              disabled={loading}
            >
              <option value={0}>January</option>
              <option value={1}>February</option>
              <option value={2}>March</option>
              <option value={3}>April</option>
              <option value={4}>May</option>
              <option value={5}>June</option>
              <option value={6}>July</option>
              <option value={7}>August</option>
              <option value={8}>September</option>
              <option value={9}>October</option>
              <option value={10}>November</option>
              <option value={11}>December</option>
            </select>
            <select
              className="border rounded px-2 py-1"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              disabled={loading}
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i,
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={handlePrint} disabled={loading} className="no-print">
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Loading monthly report data...</p>
        </div>
      ) : (
        <>
          <div
            className="no-print"
            style={{ display: isPrinting ? "none" : "block" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalIssuance)}
                  </div>
                  <p className="text-muted-foreground">Total Funds Issued</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.spendingTotal)}
                  </div>
                  <p className="text-muted-foreground">Total Funds Spent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.safeCashBalance)}
                  </div>
                  <p className="text-muted-foreground">Safe Cash</p>
                  <p className="text-xs text-muted-foreground">
                    Cash that should be in the safe
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats.agentCashOnHand)}
                  </div>
                  <p className="text-muted-foreground">Agent Cash on Hand</p>
                  <p className="text-xs text-muted-foreground">
                    Cash issued to agents
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Transactions</TabsTrigger>
                <TabsTrigger value="issuance">Issuance</TabsTrigger>
                <TabsTrigger value="spending">Spending</TabsTrigger>
                <TabsTrigger value="return">Returns</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
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
                          <th className="py-2 px-4 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData?.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-4 text-center text-muted-foreground"
                            >
                              No transactions found for this month
                            </td>
                          </tr>
                        ) : (
                          filteredData?.map((transaction) => (
                            <tr key={transaction.id} className="border-b">
                              <td className="py-2 px-4">
                                {transaction.transaction_date
                                  ? new Date(
                                      transaction.transaction_date,
                                    ).toLocaleDateString()
                                  : new Date(
                                      transaction.created_at,
                                    ).toLocaleDateString()}
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
                              <td className="py-2 px-4 capitalize">
                                {transaction.status || "approved"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="issuance" className="mt-4">
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-left">Date</th>
                          <th className="py-2 px-4 text-left">Amount</th>
                          <th className="py-2 px-4 text-left">Agent</th>
                          <th className="py-2 px-4 text-left">Receipt #</th>
                          <th className="py-2 px-4 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData?.filter(
                          (t) => t.transaction_type === "issuance",
                        ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 text-center text-muted-foreground"
                            >
                              No issuance transactions found for this month
                            </td>
                          </tr>
                        ) : (
                          filteredData
                            ?.filter((t) => t.transaction_type === "issuance")
                            .map((transaction) => (
                              <tr key={transaction.id} className="border-b">
                                <td className="py-2 px-4">
                                  {transaction.transaction_date
                                    ? new Date(
                                        transaction.transaction_date,
                                      ).toLocaleDateString()
                                    : new Date(
                                        transaction.created_at,
                                      ).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-4">
                                  {formatCurrency(
                                    parseFloat(transaction.amount),
                                  )}
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
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="spending" className="mt-4">
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-left">Date</th>
                          <th className="py-2 px-4 text-left">Amount</th>
                          <th className="py-2 px-4 text-left">Agent</th>
                          <th className="py-2 px-4 text-left">Receipt #</th>
                          <th className="py-2 px-4 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData?.filter(
                          (t) => t.transaction_type === "spending",
                        ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 text-center text-muted-foreground"
                            >
                              No spending transactions found for this month
                            </td>
                          </tr>
                        ) : (
                          filteredData
                            ?.filter((t) => t.transaction_type === "spending")
                            .map((transaction) => (
                              <tr key={transaction.id} className="border-b">
                                <td className="py-2 px-4">
                                  {transaction.transaction_date
                                    ? new Date(
                                        transaction.transaction_date,
                                      ).toLocaleDateString()
                                    : new Date(
                                        transaction.created_at,
                                      ).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-4">
                                  {formatCurrency(
                                    parseFloat(transaction.amount),
                                  )}
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
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="return" className="mt-4">
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-2 px-4 text-left">Date</th>
                          <th className="py-2 px-4 text-left">Amount</th>
                          <th className="py-2 px-4 text-left">Agent</th>
                          <th className="py-2 px-4 text-left">Receipt #</th>
                          <th className="py-2 px-4 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData?.filter(
                          (t) => t.transaction_type === "return",
                        ).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-4 text-center text-muted-foreground"
                            >
                              No return transactions found for this month
                            </td>
                          </tr>
                        ) : (
                          filteredData
                            ?.filter((t) => t.transaction_type === "return")
                            .map((transaction) => (
                              <tr key={transaction.id} className="border-b">
                                <td className="py-2 px-4">
                                  {transaction.transaction_date
                                    ? new Date(
                                        transaction.transaction_date,
                                      ).toLocaleDateString()
                                    : new Date(
                                        transaction.created_at,
                                      ).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-4">
                                  {formatCurrency(
                                    parseFloat(transaction.amount),
                                  )}
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
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div
            style={{ display: isPrinting ? "block" : "none" }}
            className="print-only"
          >
            <PrintableReport
              reportData={filteredData}
              stats={stats}
              startDate={new Date(selectedYear, selectedMonth, 1)}
              endDate={new Date(selectedYear, selectedMonth + 1, 0)}
              isMonthlyReport={true}
            />
          </div>
        </>
      )}
    </div>
  );
}
