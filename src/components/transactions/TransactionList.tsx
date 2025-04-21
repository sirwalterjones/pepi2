"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Transaction, TransactionType, TransactionWithAgent } from "@/types/schema";
import TransactionDetails from "./TransactionDetails";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { Button } from "../ui/button";
import TransactionForm from "./TransactionForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Plus,
} from "lucide-react";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useToast } from "../ui/use-toast";
import TransactionStatus from "./TransactionStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import FundRequestForm from "../requests/FundRequestForm";
import { PlusCircle } from "lucide-react";

export default function TransactionList() {
  // Function to check if a transaction belongs to the current user
  const isOwnTransaction = (transaction: any) => {
    return currentUserAgentId && transaction.agent_id === currentUserAgentId;
  };
  const [transactions, setTransactions] = useState<TransactionWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithAgent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentUserAgentId, setCurrentUserAgentId] = useState<string | null>(
    null,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAgentMap, setUserAgentMap] = useState<{ [key: string]: boolean }>(
    {},
  );
  const { toast } = useToast();
  const supabase = createClient();
  const { activeBook } = usePepiBooks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);

  // Fetch current user's agent ID and role
  useEffect(() => {
    const fetchCurrentUserAgent = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: agentData, error: agentError } = await supabase
            .from("agents")
            .select("id, role")
            .eq("user_id", user.id)
            .single();

          if (agentError) {
            console.error("Error fetching agent data:", agentError);
            return;
          }

          if (agentData) {
            setCurrentUserAgentId(agentData.id);
            setIsAdmin(agentData.role === "admin");

            // Create a map for quick lookup
            const newUserAgentMap: { [key: string]: boolean } = {};
            newUserAgentMap[agentData.id] = true;
            setUserAgentMap(newUserAgentMap);
          }
        }
      } catch (error) {
        console.error("Error fetching current user agent:", error);
      }
    };

    fetchCurrentUserAgent();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          agent:agents!transactions_agent_id_fkey ( id, name, badge_number )
        `)
        .order("created_at", { ascending: false });

      // Filter by active PEPI book if available
      if (activeBook?.id) {
        query = query.eq("pepi_book_id", activeBook.id);
      }

      // Filter by transaction type if selected
      if (filterType !== "all") {
        query = query.eq("transaction_type", filterType);
      }

      // If user is not an admin, only show their transactions
      if (!isAdmin && currentUserAgentId) {
        query = query.eq("agent_id", currentUserAgentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        toast({
          title: "Error fetching transactions",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setTransactions((data as TransactionWithAgent[]) || []);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filterType, activeBook?.id, currentUserAgentId, isAdmin]);

  // Set up real-time subscription for transactions
  useEffect(() => {
    const subscription = supabase
      .channel("transactions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchTransactions();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filteredTransactions = transactions.filter((transaction: TransactionWithAgent) => {
    if (!searchTerm) return true;

    return (
      transaction.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.receipt_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.agent?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.agent?.badge_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "spending":
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      case "return":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return <Badge variant="destructive">Issued</Badge>;
      case "spending":
        return <Badge variant="outline">Spent</Badge>;
      case "return":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
          >
            Returned
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
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

  // Calculate agent's running balance
  const calculateAgentBalance = () => {
    if (!currentUserAgentId || !transactions.length) return 0;

    let balance = 0;
    transactions.forEach((transaction: TransactionWithAgent) => {
      if (
        transaction.agent_id === currentUserAgentId &&
        (transaction.status === "approved" || transaction.status === "pending")
      ) {
        if (transaction.transaction_type === "issuance") {
          balance += transaction.amount;
        } else if (transaction.transaction_type === "spending") {
          balance -= transaction.amount;
        } else if (transaction.transaction_type === "return") {
          balance -= transaction.amount;
        }
      }
    });

    return balance;
  };

  // Calculate PEPI book's running balance (for admin view)
  const calculatePepiBookBalance = () => {
    if (!activeBook) return 0;

    // Start with the initial balance from the active PEPI book
    const initialFunding = activeBook.starting_amount || 0;

    // Calculate total spending
    let spendingTotal = 0;

    // Only process if we have transactions
    if (transactions.length) {
      // Calculate based on approved and pending transactions
      transactions.forEach((transaction: TransactionWithAgent) => {
        if (
          (transaction.status === "approved" ||
            transaction.status === "pending") &&
          transaction.pepi_book_id === activeBook.id
        ) {
          if (transaction.transaction_type === "spending") {
            spendingTotal += transaction.amount;
          }
        }
      });
    }

    // Current balance is the initial funding minus what's been spent
    return initialFunding - spendingTotal;
  };

  const agentBalance = calculateAgentBalance();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {activeBook
                ? `${isAdmin ? "All" : "Your"} transactions for ${activeBook.year} PEPI Book`
                : isAdmin
                  ? "View and manage all fund transactions"
                  : "View and manage your transactions"}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
            {!isAdmin && (
               <Dialog open={isRequestFormOpen} onOpenChange={setIsRequestFormOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                     <PlusCircle className="mr-2 h-4 w-4" /> Request Funds
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Request Additional Funds</DialogTitle>
                    <DialogDescription>
                      Submit a request for more funds. Enter the amount and reason below.
                    </DialogDescription>
                  </DialogHeader>
                  <FundRequestForm onSuccess={() => setIsRequestFormOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {isAdmin && activeBook && (
          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-green-800">
                  PEPI Book Running Balance
                </h3>
                <p className="text-xs text-green-600 mt-1">
                  Current balance for {activeBook.year} PEPI Book
                </p>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(calculatePepiBookBalance())}
              </div>
            </div>
          </div>
        )}

        {!isAdmin && currentUserAgentId && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Your Current Balance
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  Funds currently assigned to you
                </p>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(agentBalance)}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by description, receipt number, or agent..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="issuance">Issuance</SelectItem>
                <SelectItem value="spending">Spending</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || filterType !== "all"
              ? "No matching transactions found"
              : "No transactions yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction: TransactionWithAgent) => (
              <div
                key={transaction.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${transaction.status === "rejected" ? "border-red-300 bg-red-50" : ""}`}
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
                      {transaction.agent?.name && (
                        <>
                          <span>•</span>
                          <span>Agent: {transaction.agent.name} {transaction.agent.badge_number ? `(#${transaction.agent.badge_number})` : ''}</span>
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
                      {transaction.transaction_type === "issuance" ||
                      transaction.transaction_type === "return"
                        ? "+"
                        : transaction.transaction_type === "spending"
                          ? "-"
                          : ""}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </div>
                    <div className="flex flex-col gap-1">
                      {getTransactionBadge(transaction.transaction_type)}
                      {transaction.status && (
                        <TransactionStatus status={transaction.status} />
                      )}
                      {transaction.status === "rejected" &&
                        isOwnTransaction(transaction) && (
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-300 animate-pulse"
                          >
                            Action Required
                          </Badge>
                        )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setIsDetailsOpen(true);
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() => setIsFormOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </CardFooter>

      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onTransactionCreated={fetchTransactions}
      />

      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onDelete={fetchTransactions}
          onEdit={() => {
            fetchTransactions();
            setIsDetailsOpen(false);
          }}
        />
      )}
    </Card>
  );
}
