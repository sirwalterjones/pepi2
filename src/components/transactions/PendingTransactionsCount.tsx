"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";

interface PendingTransactionsCountProps {
  bookId: string;
}

export default function PendingTransactionsCount({
  bookId,
}: PendingTransactionsCountProps) {
  const [count, setCount] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchPendingTransactionsCount() {
      try {
        const { count, error } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("pepi_book_id", bookId);

        if (error) {
          console.error("Error fetching pending transactions count:", error);
          return;
        }

        setCount(count || 0);
      } catch (error) {
        console.error("Error fetching pending transactions count:", error);
      }
    }

    fetchPendingTransactionsCount();

    // Set up real-time subscription for transactions
    const transactionChannel = supabase
      .channel(`pending-transactions-count-${bookId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `pepi_book_id=eq.${bookId}`,
        },
        () => {
          // Refetch count when any transaction changes
          fetchPendingTransactionsCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
    };
  }, [bookId, supabase]);

  if (count === null) {
    return <span className="animate-pulse">Loading...</span>;
  }

  return <span>{count}</span>;
}
