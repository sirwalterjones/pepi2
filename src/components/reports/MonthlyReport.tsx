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
  const [currentDate, setCurrentDate] = useState(new Date());
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
      // Format dates for filtering
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();

      // Fetch transactions for the selected month with proper date filtering
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*, agents(id, name, badge_number)")
        .or(
          `transaction_date.gte.${formattedStartDate},transaction_date.lte.${formattedEndDate},and(created_at.gte.${formattedStartDate},created_at.lte.${formattedEndDate})`,
        )
        .order("created_at", { ascending: false });

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
  }, [currentDate]);

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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousMonth}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            Monthly Report - {format(currentDate, "MMMM yyyy")}
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            disabled={loading || addMonths(currentDate, 1) > new Date()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
                        {reportData?.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-4 text-center text-muted-foreground"
                            >
                              No transactions found for this month
                            </td>
                          </tr>
                        ) : (
                          reportData?.map((transaction) => (
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
                        {reportData?.filter(
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
                          reportData
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
                        {reportData?.filter(
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
                          reportData
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
                        {reportData?.filter(
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
                          reportData
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
              reportData={reportData}
              stats={stats}
              startDate={startDate}
              endDate={endDate}
              isMonthlyReport={true}
            />
          </div>
        </>
      )}
    </div>
  );
}
