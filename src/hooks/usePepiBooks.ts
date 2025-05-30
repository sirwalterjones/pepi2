"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { PepiBook, Transaction } from "@/types/schema";

type PepiBookWithBalances = PepiBook & {
  additionalFunds: number;
  currentBalance: number;
  agentCashOnHand: number;
  safeCashBalance: number;
};

export function usePepiBooks() {
  const [pepiBooks, setPepiBooks] = useState<PepiBookWithBalances[]>([]);
  const [activeBook, setActiveBook] = useState<PepiBookWithBalances | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPepiBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all PEPI books
      const { data: booksData, error: booksError } = await supabase
        .from("pepi_books")
        .select("*")
        .order("year", { ascending: false });

      if (booksError) throw new Error(booksError.message);
      if (!booksData) throw new Error("No PEPI books found");

      // Fetch all transactions for all books
      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("transactions")
          .select("*")
          .in(
            "pepi_book_id",
            booksData.map((book) => book.id),
          );

      if (transactionsError) throw new Error(transactionsError.message);

      // Calculate additional funds and current balance for each book
      const booksWithBalances = booksData.map((book) => {
        const bookTransactions =
          transactionsData?.filter(
            (tx: Transaction) => tx.pepi_book_id === book.id,
          ) || [];

        // Calculate additional funds - look for transactions with receipt numbers starting with "ADD"
        const additionalFundsTransactions = bookTransactions.filter(
          (tx: Transaction) =>
            tx.status === "approved" && tx.receipt_number?.startsWith("ADD"),
        );

        const additionalFunds = additionalFundsTransactions.reduce(
          (sum: number, tx: Transaction) => sum + Number(tx.amount),
          0,
        );

        // Calculate balances based on the corrected logic
        let totalBalance = book.starting_amount || 0;
        let issuedToAgents = 0;
        let totalSpent = 0;
        let totalAdditions = 0;

        // Process all transactions to calculate balances
        bookTransactions.forEach((tx) => {
          if (tx.status !== "approved") return;

          if (tx.transaction_type === "issuance") {
            // For issuances to agents, track separately
            if (tx.agent_id) {
              issuedToAgents += Number(tx.amount);
            }
            // For additions to the book (receipt starts with ADD)
            else if (tx.receipt_number?.startsWith("ADD")) {
              totalAdditions += Number(tx.amount);
            }
          } else if (tx.transaction_type === "return") {
            // Returns only affect agent cash on hand and safe cash
            if (tx.agent_id) {
              issuedToAgents -= Number(tx.amount);
            }
          } else if (tx.transaction_type === "spending") {
            // All spending reduces the total balance
            totalSpent += Number(tx.amount);

            // If spent by an agent, reduce their cash on hand
            if (tx.agent_id) {
              issuedToAgents -= Number(tx.amount);
            }
          }
        });

        // Calculate current balance: initial + additions - expenditures
        totalBalance = book.starting_amount + totalAdditions - totalSpent;

        // Calculate safe cash: current balance - what's issued to agents
        const safeCashBalance = totalBalance - issuedToAgents;

        return {
          ...book,
          additionalFunds,
          currentBalance: totalBalance,
          agentCashOnHand: issuedToAgents,
          safeCashBalance: safeCashBalance,
        };
      });

      setPepiBooks(booksWithBalances);

      // Find the active book
      const active = booksWithBalances.find((book) => book.is_active);
      setActiveBook(active || null);
    } catch (err) {
      console.error("Error fetching PEPI books:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch PEPI books",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPepiBooks();

    // Set up real-time subscription for both books and transactions
    const booksSubscription = supabase
      .channel("pepi_books_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pepi_books" },
        () => {
          fetchPepiBooks();
        },
      )
      .subscribe();

    const transactionsSubscription = supabase
      .channel("transactions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchPepiBooks();
        },
      )
      .subscribe();

    return () => {
      booksSubscription.unsubscribe();
      transactionsSubscription.unsubscribe();
    };
  }, []);

  return {
    pepiBooks,
    activeBook,
    loading,
    error,
    refresh: fetchPepiBooks,
  };
}
