"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
} from "lucide-react";
import {
  TransactionType,
  Transaction,
  TransactionWithAgent,
} from "@/types/schema";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { useToast } from "@/components/ui/use-toast";

type DashboardStats = {
  totalAgents: number;
  totalTransactions: number;
  totalIssuance: number;
  totalReturned: number;
  currentBalance: number;
  cashOnHand: number;
  spendingTotal: number;
  activePepiBookId: string | null;
  activePepiBookYear: number | null;
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    totalTransactions: 0,
    totalIssuance: 0,
    totalReturned: 0,
    currentBalance: 0,
    cashOnHand: 0,
    spendingTotal: 0,
    activePepiBookId: null,
    activePepiBookYear: null,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lowBalanceAlertShown, setLowBalanceAlertShown] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const supabase = createClient();
  const { activeBook } = usePepiBooks();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is admin
    async function checkUserRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("agents")
            .select("role")
            .eq("user_id", user.id)
            .single();

          if (data && data.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    }

    checkUserRole();
  }, []);

  useEffect(() => {
    // Only run fetchDashboardData if activeBook is loaded and has an ID
    if (activeBook && activeBook.id) {
      fetchDashboardData();
    } else if (activeBook === null) {
      // Handle case where no book is selected/available
      setLoading(false);
      setInitialLoadComplete(true); // Mark load as complete
      setStats({
        // Reset stats to default
        totalAgents: 0,
        totalTransactions: 0,
        totalIssuance: 0,
        totalReturned: 0,
        currentBalance: 0,
        cashOnHand: 0,
        spendingTotal: 0,
        activePepiBookId: null,
        activePepiBookYear: null,
      });
    }
    // If activeBook is undefined (still loading), do nothing yet
  }, [activeBook]); // Dependency remains activeBook

  // ADDED: Real-time subscription for transaction changes
  useEffect(() => {
    // Only subscribe if we have an active book
    if (!activeBook?.id) return;

    console.log(
      `[DashboardOverview] Setting up subscription for transactions in book: ${activeBook.id}`,
    );
    const transactionChannel = supabase
      .channel(`overview-transactions-changes-${activeBook.id}`) // Unique channel name per book
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `pepi_book_id=eq.${activeBook.id}`, // Filter for relevant book
        },
        (payload) => {
          console.log(
            "[DashboardOverview] Transaction change detected, refetching stats...",
            payload,
          );
          fetchDashboardData(); // Refetch stats on any change
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[DashboardOverview] Real-time subscription active.");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(
            "[DashboardOverview] Real-time subscription error:",
            status,
            err,
          );
        }
      });

    // Cleanup
    return () => {
      console.log("[DashboardOverview] Removing real-time subscription.");
      supabase.removeChannel(transactionChannel);
    };
  }, [supabase, activeBook?.id]); // Depend on supabase client and active book ID

  // fetchDashboardData function now assumes activeBook is valid when called
  async function fetchDashboardData() {
    // Add check to satisfy TypeScript and prevent errors if called unexpectedly
    if (!activeBook) return;

    // No need for inner activeBook check anymore
    setLoading(true);
    setInitialLoadComplete(false);
    try {
      // Fetch agents count
      const { count: agentsCount, error: agentsError } = await supabase
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Fetch transactions with agent details filtered by active PEPI book
      let transactionQuery = supabase
        .from("transactions")
        .select("*, agent:agents(name, badge_number)")
        .order("created_at", { ascending: false })
        .eq("pepi_book_id", activeBook.id); // Directly use activeBook.id

      const { data: transactions, error: transactionsError } =
        await transactionQuery;

      if (agentsError || transactionsError) {
        console.error(
          "Error fetching dashboard data:",
          agentsError || transactionsError,
        );
        return;
      }

      // Calculate stats based on APPROVED transactions only using the refined logic
      let pepiBookBalance = 0;
      let totalIssuedToAgents = 0;
      let totalSpentByAgents = 0;
      let totalReturnedByAgents = 0;
      let totalAddedToBook = 0;

      // Start with the initial amount from the PEPI book

      // Process all transactions to calculate balances
      transactions?.forEach((transaction: Transaction) => {
        if (transaction.status === "approved") {
          if (transaction.transaction_type === "issuance") {
            if (transaction.agent_id !== null) {
              // Issuance TO an agent
              totalIssuedToAgents += transaction.amount;
              // Does NOT affect book balance directly
            } else if (transaction.receipt_number?.startsWith("ADD")) {
              // Additions to the book (receipt starts with ADD)
              totalAddedToBook += transaction.amount;
              pepiBookBalance += transaction.amount;
            }
          } else if (transaction.transaction_type === "spending") {
            // All spending reduces the total balance
            totalSpentByAgents += transaction.amount;
            pepiBookBalance -= transaction.amount;

            // If spent by an agent, reduce their cash on hand
            if (transaction.agent_id) {
              totalIssuedToAgents -= transaction.amount;
            }
          } else if (transaction.transaction_type === "return") {
            // Returns only affect agent cash on hand
            if (transaction.agent_id) {
              totalIssuedToAgents -= transaction.amount;
              totalReturnedByAgents += transaction.amount;
            }
          }
        }
      });

      // Calculate safe cash: current balance - what's issued to agents
      let safeCashBalance = pepiBookBalance - totalIssuedToAgents;

      setStats({
        totalAgents: agentsCount || 0,
        totalTransactions:
          transactions?.filter((t) => t.status === "approved").length || 0,
        totalIssuance: totalIssuedToAgents, // Reflects funds issued TO agents
        totalReturned: totalReturnedByAgents, // Reflects funds returned BY agents
        currentBalance: pepiBookBalance, // Total book balance (initial + additions - expenditures)
        cashOnHand: safeCashBalance, // Safe cash (current balance - what's with agents)
        spendingTotal: totalSpentByAgents, // Reflects funds spent BY agents
        activePepiBookId: activeBook?.id || null,
        activePepiBookYear: activeBook?.year || null,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Initial Funding
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(activeBook?.starting_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              PEPI book starting amount
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Issued To Agents
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalIssuance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved funds moved to agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Spent By Agents
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.spendingTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved spending by agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Returned By Agents
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalReturned)}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved funds returned by agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Book Balance (Safe Cash)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.cashOnHand)}
            </div>
            <p className="text-xs text-muted-foreground">
              Remaining funds in PEPI Book (minus all spent items)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">Task force members</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
