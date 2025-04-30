"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth, format } from "date-fns";
import PrintableReport from "./PrintableReport";

export default function MonthlyReport() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any[] | null>(null);
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalTransactions: 0,
    totalIssuance: 0,
    totalReturned: 0,
    currentBalance: 0,
    cashOnHand: 0,
    spendingTotal: 0,
    activePepiBookYear: null as number | null,
  });
  const [isPrinting, setIsPrinting] = useState(false);

  // Get the current month's start and end dates
  const startDate = startOfMonth(new Date());
  const endDate = endOfMonth(new Date());

  useEffect(() => {
    async function fetchMonthlyData() {
      setLoading(true);
      const supabase = createClient();

      try {
        // Fetch transactions for the current month
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select(
            "*, agents(id, name, badge_number), created_by_user:created_by(id, email, user_metadata)",
          )
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
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

        transactions?.forEach((transaction) => {
          if (transaction.transaction_type === "issuance") {
            totalIssuance += parseFloat(transaction.amount);
          } else if (transaction.transaction_type === "return") {
            totalReturned += parseFloat(transaction.amount);
          } else if (transaction.transaction_type === "spending") {
            spendingTotal += parseFloat(transaction.amount);
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
        });
      } catch (error) {
        console.error("Error fetching monthly report data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMonthlyData();
  }, []);

  const handlePrint = () => {
    setIsPrinting(true);
    // Use a longer timeout to ensure the content is fully rendered
    setTimeout(() => {
      window.print();
      // Set isPrinting back to false after printing is complete
      setTimeout(() => setIsPrinting(false), 500);
    }, 300);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Monthly Report - {format(new Date(), "MMMM yyyy")}
        </h1>
        <Button onClick={handlePrint} disabled={loading} className="no-print">
          Print Report
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
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
                    ${stats.totalIssuance.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground">Total Funds Issued</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    ${stats.spendingTotal.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground">Total Funds Spent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    ${stats.cashOnHand.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground">Cash On Hand</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    ${stats.currentBalance.toFixed(2)}
                  </div>
                  <p className="text-muted-foreground">Current Balance</p>
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
                        {reportData?.map((transaction) => (
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
                              ${parseFloat(transaction.amount).toFixed(2)}
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
                        ))}
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
                        {reportData
                          ?.filter((t) => t.transaction_type === "issuance")
                          .map((transaction) => (
                            <tr key={transaction.id} className="border-b">
                              <td className="py-2 px-4">
                                {new Date(
                                  transaction.transaction_date ||
                                    transaction.created_at,
                                ).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-4">
                                ${parseFloat(transaction.amount).toFixed(2)}
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
                          ))}
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
                        {reportData
                          ?.filter((t) => t.transaction_type === "spending")
                          .map((transaction) => (
                            <tr key={transaction.id} className="border-b">
                              <td className="py-2 px-4">
                                {new Date(
                                  transaction.transaction_date ||
                                    transaction.created_at,
                                ).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-4">
                                ${parseFloat(transaction.amount).toFixed(2)}
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
                          ))}
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
                        {reportData
                          ?.filter((t) => t.transaction_type === "return")
                          .map((transaction) => (
                            <tr key={transaction.id} className="border-b">
                              <td className="py-2 px-4">
                                {new Date(
                                  transaction.transaction_date ||
                                    transaction.created_at,
                                ).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-4">
                                ${parseFloat(transaction.amount).toFixed(2)}
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
                          ))}
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
