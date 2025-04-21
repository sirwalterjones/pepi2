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
import { TransactionType, Transaction, TransactionWithAgent } from "@/types/schema";
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
      setStats({ // Reset stats to default
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

    console.log(`[DashboardOverview] Setting up subscription for transactions in book: ${activeBook.id}`);
    const transactionChannel = supabase
      .channel(`overview-transactions-changes-${activeBook.id}`) // Unique channel name per book
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions', 
          filter: `pepi_book_id=eq.${activeBook.id}` // Filter for relevant book
        },
        (payload) => {
          console.log('[DashboardOverview] Transaction change detected, refetching stats...', payload);
          fetchDashboardData(); // Refetch stats on any change
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('[DashboardOverview] Real-time subscription active.');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[DashboardOverview] Real-time subscription error:', status, err);
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

      // Fetch active PEPI book details - we know activeBook is valid
      let startingAmount = activeBook.starting_amount || 0;

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

      // Calculate stats
      let issuanceTotal = 0;
      let returnedTotal = 0;
      let spendingTotal = 0;

      // Find initial funding transaction
      const initialFundingTransaction = transactions?.find(
        (transaction: Transaction) =>
          transaction.transaction_type === "issuance" &&
          transaction.description?.toLowerCase().includes("initial funding"),
      );

      transactions?.forEach((transaction: Transaction) => {
        if (
          (transaction.status === "approved" ||
            transaction.status === "pending") &&
          // Skip the initial funding transaction when calculating issuance total
          transaction.id !== initialFundingTransaction?.id
        ) {
          if (transaction.transaction_type === "issuance") {
            issuanceTotal += transaction.amount;
          } else if (transaction.transaction_type === "return") {
            returnedTotal += transaction.amount;
          } else if (transaction.transaction_type === "spending") {
            spendingTotal += transaction.amount;
          }
        }
      });

      // Initial funding is the starting amount from the PEPI book
      const initialFunding = startingAmount;

      // Cash on hand is the initial funding minus what's been spent
      const cashOnHand = initialFunding - spendingTotal;

      // Current balance should account for initial funding, spending, and returns
      const currentBalance = initialFunding - spendingTotal + returnedTotal;

      setStats({
        totalAgents: agentsCount || 0,
        totalTransactions: transactions?.length || 0,
        totalIssuance: issuanceTotal,
        totalReturned: returnedTotal,
        currentBalance: currentBalance,
        cashOnHand: cashOnHand,
        spendingTotal: spendingTotal,
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

  // Effect to check balance and show alert (remove debug log)
  useEffect(() => {
    if (
      initialLoadComplete &&
      isAdmin &&
      stats.currentBalance <= 500 &&
      !lowBalanceAlertShown
    ) {
      toast({
        title: "Low Balance Alert",
        description: `Current balance is ${formatCurrency(
          stats.currentBalance,
        )}. Please consider adding funds.`,
        variant: "destructive",
      });
      setLowBalanceAlertShown(true);
    }
  }, [initialLoadComplete, stats.currentBalance, isAdmin, lowBalanceAlertShown, toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {stats.activePepiBookYear && (
        <div className="bg-muted p-4 rounded-lg mb-4">
          <h2 className="text-lg font-medium">
            Active PEPI Book: {stats.activePepiBookYear}
          </h2>
          <p className="text-sm text-muted-foreground">
            All statistics below are filtered for the active PEPI book
          </p>
        </div>
      )}
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
              Total PEPI book funds
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Funds Issued
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalIssuance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Funds issued to agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Funds Spent
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.spendingTotal || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Funds spent by agents
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash On Hand</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.cashOnHand)}
            </div>
            <p className="text-xs text-muted-foreground">
              Initial funds minus spent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
              {stats.currentBalance <= 500 && (
                <span className="ml-2 inline-flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </span>
              )}
            </CardTitle>
            <DollarSign
              className={`h-4 w-4 ${stats.currentBalance <= 500 ? "text-red-500" : "text-green-600"}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Initial funding amount
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
