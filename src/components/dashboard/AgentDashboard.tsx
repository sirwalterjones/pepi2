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
import { Transaction, TransactionType } from "@/types/schema";
import { Badge } from "../ui/badge";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  PlusCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import TransactionStatus from "../transactions/TransactionStatus";
import { useToast } from "../ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FundRequestForm from "../requests/FundRequestForm";

export default function AgentDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [rejectedTransactions, setRejectedTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [agentBalance, setAgentBalance] = useState<number>(0);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    const fetchAgentData = async () => {
      console.log("AgentDashboard: fetchAgentData started");
      setLoading(true);
      try {
        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        console.log("AgentDashboard: getUser result", { user, authError });

        if (authError || !user) {
          console.error("AgentDashboard: User not found or auth error.");
          setLoading(false);
          return;
        }

        // Get agent info
        console.log(`AgentDashboard: Fetching agent for user_id: ${user.id}`);
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .maybeSingle();

        console.log("AgentDashboard: agent query result", {
          agentData,
          agentError,
        });

        if (agentError) {
          console.error(
            "AgentDashboard: Error fetching agent info:",
            agentError,
          );
          setLoading(false);
          return;
        }

        if (!agentData) {
          console.warn("AgentDashboard: No agent record found for this user.");
          setLoading(false);
          return;
        }

        console.log("AgentDashboard: Setting agentInfo state.");
        setAgentInfo(agentData);

        // Fetch transactions (Only if agentData is valid)
        console.log(
          `AgentDashboard: Fetching transactions for agent_id: ${agentData.id}`,
        );
        const { data: transactionData, error: transactionError } =
          await supabase
            .from("transactions")
            .select(
              `*,
               agents:agent_id (id, name, badge_number)
              `,
            )
            .eq("agent_id", agentData.id)
            .order("created_at", { ascending: false });

        console.log("AgentDashboard: transaction query result", {
          transactionData,
          transactionError,
        });

        if (transactionError) {
          console.error(
            "AgentDashboard: Error fetching transactions:",
            transactionError,
          );
        }

        // Process transactions even if fetch failed (transactionData might be null)
        const pending =
          transactionData?.filter((t) => t.status === "pending") || [];
        const rejected =
          transactionData?.filter((t) => t.status === "rejected") || [];
        setPendingTransactions(pending);
        setRejectedTransactions(rejected);
        setTransactions(transactionData || []);

        // Calculate agent's current balance
        let balance = 0;
        transactionData?.forEach((transaction) => {
          if (
            transaction.status === "approved" ||
            transaction.status === "pending"
          ) {
            if (transaction.transaction_type === "issuance") {
              balance += parseFloat(transaction.amount);
            } else if (transaction.transaction_type === "spending") {
              balance -= parseFloat(transaction.amount);
            } else if (transaction.transaction_type === "return") {
              balance -= parseFloat(transaction.amount);
            }
          }
        });
        console.log("AgentDashboard: Calculated balance", { balance });
        setAgentBalance(balance);
      } catch (error) {
        console.error(
          "AgentDashboard: Error in fetchAgentData try block:",
          error,
        );
      } finally {
        console.log("AgentDashboard: fetchAgentData finished");
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [supabase]);

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case "spending":
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      case "return":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Info Card */}
      {agentInfo && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Agent Dashboard</CardTitle>
                <CardDescription>
                  Welcome, {agentInfo.name}. View your transactions and pending
                  approvals.
                </CardDescription>
              </div>
              <Dialog
                open={isRequestFormOpen}
                onOpenChange={setIsRequestFormOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Request Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <FundRequestForm
                    onSuccess={() => setIsRequestFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Badge Number
                </div>
                <div className="text-xl font-bold">
                  {agentInfo.badge_number || "N/A"}
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Total Transactions
                </div>
                <div className="text-xl font-bold">{transactions.length}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Current Balance
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(agentBalance)}
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Pending Approvals
                </div>
                <div className="text-xl font-bold">
                  {pendingTransactions.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Transactions */}
      {(pendingTransactions.length > 0 || rejectedTransactions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Status</CardTitle>
            <CardDescription>
              Transactions awaiting review or with feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTransactions.length > 0 && (
                <div className="mb-2">
                  <h3 className="text-sm font-medium mb-2">
                    Pending Approvals
                  </h3>
                  <div className="space-y-2">
                    {pendingTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg bg-yellow-50 gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            {getTransactionIcon(transaction.transaction_type)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {transaction.description ||
                                `Transaction ${transaction.id.substring(0, 8)}`}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{formatDate(transaction.created_at)}</span>
                              {transaction.receipt_number && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Receipt: {transaction.receipt_number}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </div>
                            <div className="flex flex-col gap-1">
                              <TransactionStatus
                                status={transaction.status}
                                size="sm"
                              />
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/dashboard/transactions?id=${transaction.id}`}
                            >
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rejectedTransactions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">
                    Rejected Transactions
                  </h3>
                  <div className="space-y-2">
                    {rejectedTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg bg-red-50 gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full">
                            {getTransactionIcon(transaction.transaction_type)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {transaction.description ||
                                `Transaction ${transaction.id.substring(0, 8)}`}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{formatDate(transaction.created_at)}</span>
                              {transaction.receipt_number && (
                                <>
                                  <span>•</span>
                                  <span>
                                    Receipt: {transaction.receipt_number}
                                  </span>
                                </>
                              )}
                            </div>
                            {transaction.review_notes && (
                              <div className="mt-2 text-sm bg-white p-2 rounded border border-red-200">
                                <span className="font-medium">
                                  Admin Notes:{" "}
                                </span>
                                {transaction.review_notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(transaction.amount)}
                            </div>
                            <div className="flex flex-col gap-1">
                              <TransactionStatus
                                status={transaction.status}
                                size="sm"
                              />
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={`/dashboard/transactions?id=${transaction.id}`}
                            >
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your most recent fund activities</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-full">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {transaction.description ||
                          `Transaction ${transaction.id.substring(0, 8)}`}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{formatDate(transaction.created_at)}</span>
                        {transaction.receipt_number && (
                          <>
                            <span>•</span>
                            <span>Receipt: {transaction.receipt_number}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div
                        className={`font-medium ${transaction.transaction_type === "issuance" ? "text-green-600" : transaction.transaction_type === "return" ? "text-green-600" : transaction.transaction_type === "spending" ? "text-red-600" : ""}`}
                      >
                        {transaction.transaction_type === "return" ||
                        transaction.transaction_type === "issuance"
                          ? "+"
                          : transaction.transaction_type === "spending"
                            ? "-"
                            : ""}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      <div className="flex flex-col gap-1">
                        <TransactionStatus
                          status={transaction.status}
                          size="sm"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/dashboard/transactions?id=${transaction.id}`}>
                        View
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
              {transactions.length > 5 && (
                <div className="flex justify-center mt-4">
                  <Button variant="outline" asChild>
                    <a href="/dashboard/transactions">View All Transactions</a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
