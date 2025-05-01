"use client";

import React, { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Printer, Loader2 } from "lucide-react";

export default function MonthlyReport() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
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
  });

  // Fetch all transactions and active PEPI book
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClientComponentClient<Database>();

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

        if (error) throw error;

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

  // Filter transactions by selected month and year
  useEffect(() => {
    if (!transactions.length) return;

    const filtered = transactions.filter((transaction) => {
      try {
        const dateToUse =
          transaction.transaction_date || transaction.created_at;
        if (!dateToUse) return false;

        const date = new Date(dateToUse);
        return (
          date.getMonth() === selectedMonth &&
          date.getFullYear() === selectedYear
        );
      } catch (e) {
        return false;
      }
    });

    setFilteredTransactions(filtered);

    // Calculate statistics
    let totalIssuance = 0;
    let totalSpending = 0;
    let totalReturned = 0;
    let safeCashBalance = 0;
    let agentCashBalance = 0;

    filtered.forEach((transaction) => {
      if (transaction.status === "approved") {
        const amount = parseFloat(transaction.amount);

        if (transaction.transaction_type === "issuance") {
          totalIssuance += amount;
          if (transaction.agent_id) {
            agentCashBalance += amount;
          } else {
            safeCashBalance += amount;
          }
        } else if (transaction.transaction_type === "spending") {
          totalSpending += amount;
          if (transaction.agent_id) {
            agentCashBalance -= amount;
          } else {
            safeCashBalance -= amount;
          }
        } else if (transaction.transaction_type === "return") {
          totalReturned += amount;
          if (transaction.agent_id) {
            agentCashBalance -= amount;
            safeCashBalance += amount;
          }
        }
      }
    });

    setStats({
      totalIssuance,
      totalSpending,
      totalReturned,
      safeCashBalance,
      agentCashBalance,
    });
  }, [transactions, selectedMonth, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid Date";
    }
  };

  const handlePrint = () => {
    window.print();
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
        <Button
          onClick={handlePrint}
          disabled={loading}
          className="print:hidden"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-center">
          Monthly Transaction Report - {getMonthName(selectedMonth)}{" "}
          {selectedYear}
        </h1>
        {activePepiBook && (
          <p className="text-center text-muted-foreground">
            PEPI Book: {activePepiBook.year}
          </p>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <p>Loading report data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalIssuance)}
                </div>
                <p className="text-muted-foreground">Total Issued</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalSpending)}
                </div>
                <p className="text-muted-foreground">Total Spent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.totalReturned)}
                </div>
                <p className="text-muted-foreground">Total Returned</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.safeCashBalance)}
                </div>
                <p className="text-muted-foreground">Safe Cash</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.agentCashBalance)}
                </div>
                <p className="text-muted-foreground">Agent Cash</p>
              </CardContent>
            </Card>
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
                  <p className="font-medium">Total Issued:</p>
                  <p>{formatCurrency(stats.totalIssuance)}</p>
                </div>
                <div>
                  <p className="font-medium">Total Spent:</p>
                  <p>{formatCurrency(stats.totalSpending)}</p>
                </div>
                <div>
                  <p className="font-medium">Total Returned:</p>
                  <p>{formatCurrency(stats.totalReturned)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="font-medium">Safe Cash Balance:</p>
                  <p>{formatCurrency(stats.safeCashBalance)}</p>
                </div>
                <div>
                  <p className="font-medium">Agent Cash Balance:</p>
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
