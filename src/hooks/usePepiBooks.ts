"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { PepiBook } from "@/types/schema";

export function usePepiBooks() {
  const [pepiBooks, setPepiBooks] = useState<PepiBook[]>([]);
  const [activeBook, setActiveBook] = useState<PepiBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchPepiBooks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("pepi_books")
        .select("*")
        .order("year", { ascending: false });

      if (error) throw new Error(error.message);

      setPepiBooks(data as PepiBook[]);

      // Find the active book
      const active = data.find((book: PepiBook) => book.is_active);
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

    // Set up real-time subscription
    const subscription = supabase
      .channel("pepi_books_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pepi_books" },
        () => {
          fetchPepiBooks();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
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
