"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { PepiBook, Transaction } from "@/types/schema";

type PepiBookWithBalances = PepiBook & {
  additionalFunds: number;
  currentBalance: number;
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

        // Calculate additional funds - only count issuances that are not the initial funding
        // and are approved
        const additionalFundsTransactions = bookTransactions.filter(
          (tx: Transaction) =>
            tx.transaction_type === "issuance" &&
            tx.status === "approved" &&
            !tx.description?.toLowerCase().includes("initial funding"),
        );

        // Show each additional fund transaction separately in console for debugging
        console.log(
          `Additional funds transactions for book ${book.year}:`,
          additionalFundsTransactions.map((tx) => ({
            id: tx.id,
            amount: tx.amount,
            description: tx.description,
          })),
        );

        const additionalFunds = additionalFundsTransactions.reduce(
          (sum: number, tx: Transaction) => sum + Number(tx.amount),
          0,
        );

        // Calculate current balance using the same logic as the dashboard
        // Start with initial amount
        let balance = book.starting_amount || 0;

        // Add all approved issuances
        bookTransactions
          .filter(
            (tx) =>
              tx.transaction_type === "issuance" && tx.status === "approved",
          )
          .forEach((tx) => {
            balance += Number(tx.amount);
            console.log(
              `Adding issuance: ${tx.amount}, new balance: ${balance}, desc: ${tx.description}`,
            );
          });

        // Add all approved returns
        bookTransactions
          .filter(
            (tx) =>
              tx.transaction_type === "return" && tx.status === "approved",
          )
          .forEach((tx) => {
            balance += Number(tx.amount);
            console.log(`Adding return: ${tx.amount}, new balance: ${balance}`);
          });

        // Subtract all approved spending
        bookTransactions
          .filter(
            (tx) =>
              tx.transaction_type === "spending" && tx.status === "approved",
          )
          .forEach((tx) => {
            balance -= Number(tx.amount);
            console.log(
              `Subtracting spending: ${tx.amount}, new balance: ${balance}`,
            );
          });

        return {
          ...book,
          additionalFunds,
          currentBalance: balance,
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
