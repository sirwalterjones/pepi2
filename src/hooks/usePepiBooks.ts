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
          )
          .eq("status", "approved");

      if (transactionsError) throw new Error(transactionsError.message);

      // Calculate additional funds and current balance for each book
      const booksWithBalances = booksData.map((book) => {
        const bookTransactions =
          transactionsData?.filter(
            (tx: Transaction) => tx.pepi_book_id === book.id,
          ) || [];

        // Calculate additional funds (all issuance transactions except initial funding)
        const additionalFunds = bookTransactions
          .filter(
            (tx: Transaction) =>
              tx.transaction_type === "issuance" &&
              tx.status === "approved" &&
              !tx.description?.toLowerCase().includes("initial funding") &&
              !tx.description?.toLowerCase().includes("approved fund request"),
          )
          .reduce((sum: number, tx: Transaction) => sum + Number(tx.amount), 0);

        // Calculate current balance
        let balance = book.starting_amount || 0;
        bookTransactions.forEach((tx: Transaction) => {
          if (tx.status !== "approved") return; // Only count approved transactions

          if (tx.transaction_type === "issuance") {
            balance += Number(tx.amount);
          } else if (tx.transaction_type === "return") {
            balance += Number(tx.amount); // Returns add to balance
          } else if (tx.transaction_type === "spending") {
            balance -= Number(tx.amount); // Spending reduces balance
          }
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
