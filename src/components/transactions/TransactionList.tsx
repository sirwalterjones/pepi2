"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "../../../supabase/client";
import {
  Transaction,
  TransactionType,
  TransactionWithAgent,
  FundRequest,
  Agent,
} from "@/types/schema";
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
  Loader2,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Paperclip,
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
import { deleteFundRequestAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CiPaymentForm from "../ci-payments/CiPaymentForm";

type TransactionListItem =
  | (TransactionWithAgent & { itemType: "transaction" })
  | (FundRequest & {
      itemType: "request";
      created_at: string;
      agent?: { id: string; name: string; badge_number: string | null } | null;
    });

export default function TransactionList() {
  const isOwnTransaction = (transaction: any) => {
    return currentUserAgentId && transaction.agent_id === currentUserAgentId;
  };
  const [transactions, setTransactions] = useState<TransactionWithAgent[]>([]);
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [combinedList, setCombinedList] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithAgent | null>(null);
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
  const [requestToEdit, setRequestToEdit] = useState<FundRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isCiPaymentFormOpen, setIsCiPaymentFormOpen] = useState(false);
  const [currentAgentData, setCurrentAgentData] = useState<Agent | null>(null);
  const [runningBalances, setRunningBalances] = useState<{
    [key: string]: number;
  }>({});
  const userId = currentAgentData?.user_id;

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

            const { data: fullAgentData, error: fullAgentError } =
              await supabase
                .from("agents")
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (fullAgentError) {
              console.error(
                "Error fetching full agent details:",
                fullAgentError,
              );
            } else {
              setCurrentAgentData(fullAgentData as Agent);
            }

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
    if ((!isAdmin && !currentUserAgentId) || !activeBook?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let transactionQuery = supabase
        .from("transactions")
        .select(
          `
          *,
          agent:agents!transactions_agent_id_fkey ( id, name, badge_number )
        `,
        )
        .order("created_at", { ascending: false });

      transactionQuery = transactionQuery.eq("pepi_book_id", activeBook.id);

      if (filterType !== "all") {
        transactionQuery = transactionQuery.eq("transaction_type", filterType);
      }

      if (!isAdmin && currentUserAgentId) {
        transactionQuery = transactionQuery.eq("agent_id", currentUserAgentId);
      }

      const { data: transactionData, error: transactionError } =
        await transactionQuery;

      if (transactionError) {
        console.error("Error fetching transactions:", transactionError);
        toast({
          title: "Error fetching transactions",
          description: transactionError.message,
          variant: "destructive",
        });
      }
      const fetchedTransactions =
        (transactionData as TransactionWithAgent[]) || [];
      setTransactions(fetchedTransactions);

      let fetchedRequests: FundRequest[] = [];
      if (!isAdmin && currentUserAgentId) {
        const { data: requestData, error: requestError } = await supabase
          .from("fund_requests")
          .select(
            `*, agent:agents!fund_requests_agent_id_fkey(id, name, badge_number)`,
          )
          .eq("agent_id", currentUserAgentId)
          .eq("pepi_book_id", activeBook.id)
          .in("status", ["pending", "rejected"]);

        if (requestError) {
          console.error("Error fetching fund requests:", requestError);
          toast({
            title: "Error fetching fund requests",
            description: requestError.message,
            variant: "destructive",
          });
        } else {
          fetchedRequests = (requestData as FundRequest[]) || [];
          setRequests(fetchedRequests);
        }
      }

      const combined: TransactionListItem[] = [
        ...fetchedTransactions.map((t) => ({
          ...t,
          itemType: "transaction" as const,
        })),
        ...fetchedRequests.map((r) => ({
          ...r,
          itemType: "request" as const,
          created_at: r.requested_at,
          agent: (r as any).agent || null,
        })),
      ];

      combined.sort((a, b) => {
        // Use transaction_date if available, otherwise fall back to created_at
        const dateA =
          a.itemType === "transaction" && a.transaction_date
            ? new Date(a.transaction_date)
            : new Date(a.created_at);
        const dateB =
          b.itemType === "transaction" && b.transaction_date
            ? new Date(b.transaction_date)
            : new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });

      setCombinedList(combined);

      // Calculate running balances after fetching transactions
      const { balances } = calculatePepiBookBalance();
      setRunningBalances(balances);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Set up realtime subscription
    const channel = supabase
      .channel("transactions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          console.log("Realtime update received:", payload);
          // Add a small delay to ensure database has completed all operations
          setTimeout(() => {
            fetchTransactions(); // Refresh the list when changes occur
          }, 500);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBook?.id, filterType, currentUserAgentId, isAdmin]);

  useEffect(() => {
    if ((!isAdmin && !currentUserAgentId) || !activeBook?.id) return;

    const transactionChannel = supabase
      .channel("transactions_list_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          console.log("Transaction change detected, refetching data...");
          fetchTransactions();
        },
      )
      .subscribe();

    const requestChannel = supabase
      .channel("requests_list_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fund_requests" },
        () => {
          console.log("Fund request change detected, refetching data...");
          fetchTransactions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(requestChannel);
    };
  }, [supabase, activeBook?.id, currentUserAgentId, isAdmin]);

  const filteredCombinedList = combinedList.filter(
    (item: TransactionListItem) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();

      const agentMatch =
        item.agent?.name?.toLowerCase().includes(term) ||
        item.agent?.badge_number?.toLowerCase().includes(term);

      if (item.itemType === "transaction") {
        return (
          agentMatch ||
          item.description?.toLowerCase().includes(term) ||
          item.receipt_number?.toLowerCase().includes(term)
        );
      } else {
        // item.itemType === 'request' guaranteed by type definition
        return (
          agentMatch ||
          item.case_number?.toLowerCase().includes(term) ||
          item.status?.toLowerCase().includes(term) ||
          item.rejection_reason?.toLowerCase().includes(term) ||
          item.amount?.toString().includes(term)
        );
      }
    },
  );

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
    if (!dateString) return "";
    // Create a date object without timezone conversion
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
    // Month is 0-indexed in JavaScript Date
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper function to get the display date (transaction_date if available, otherwise created_at)
  const getDisplayDate = (item: any) => {
    if (!item) return "";
    return item.transaction_date
      ? formatDate(item.transaction_date)
      : formatDate(item.created_at || new Date().toISOString());
  };

  const agentBalance = useMemo(() => {
    if (!currentUserAgentId || !transactions.length) return 0;
    let balance = 0;
    transactions.forEach((transaction) => {
      if (
        transaction.agent_id === currentUserAgentId &&
        transaction.status === "approved"
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
  }, [transactions, currentUserAgentId]);

  const calculatePepiBookBalance = () => {
    if (!activeBook || !transactions) return { finalBalance: 0, balances: {} };

    let currentBalance = 0;
    const balances: { [key: string]: number } = {};

    console.log(
      `[calculatePepiBookBalance] Starting calculation for Book ID: ${activeBook.id}`,
    );
    console.log(
      `[calculatePepiBookBalance] Total transactions fetched: ${transactions.length}`,
    );

    // Sort transactions by date for chronological processing
    const sortedTransactions = [...transactions].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // Find initial funding transaction
    const initialFundingTx = sortedTransactions.find(
      (tx) =>
        tx.pepi_book_id === activeBook.id &&
        tx.transaction_type === "issuance" &&
        tx.status === "approved" &&
        (tx.description?.toLowerCase().includes("initial funding") ||
          tx.agent_id === null) &&
        !tx.description?.toLowerCase().includes("approved fund request"),
    );

    if (initialFundingTx) {
      currentBalance = initialFundingTx.amount;
      balances[initialFundingTx.id] = currentBalance;
      console.log(
        `  [calculatePepiBookBalance] Initial Funding/Added Tx ID: ${initialFundingTx.id.substring(0, 8)}, Amount: ${initialFundingTx.amount}, Starting Balance: ${currentBalance}`,
      );
    } else {
      currentBalance = activeBook.starting_amount || 0;
      console.log(
        `  [calculatePepiBookBalance] WARNING: Could not identify a specific initial funding transaction. Starting balance from book: ${currentBalance}`,
      );
    }

    // Process all transactions to calculate running balances
    sortedTransactions.forEach((transaction) => {
      if (transaction.id === initialFundingTx?.id) return; // Skip initial funding tx as it's already processed

      if (
        transaction.pepi_book_id === activeBook.id &&
        transaction.status === "approved"
      ) {
        let balanceChange = 0;
        let applied = false;

        if (
          transaction.transaction_type === "issuance" &&
          transaction.agent_id === null
        ) {
          // Only add to book balance if it's an issuance to the book itself (not to an agent)
          balanceChange = transaction.amount;
          currentBalance += balanceChange;
          applied = true;
        } else if (transaction.transaction_type === "spending") {
          // All spending reduces the book balance
          balanceChange = -transaction.amount;
          currentBalance += balanceChange;
          applied = true;
        } else if (transaction.transaction_type === "return") {
          // IMPORTANT: Agent returns should NOT affect the PEPI book balance
          // They only affect the agent's personal balance, not the overall book balance
          applied = false; // Don't apply returns to the book balance
        }

        if (applied) {
          console.log(
            `  [calculatePepiBookBalance] Applied Tx ID: ${transaction.id.substring(0, 8)}, Type: ${transaction.transaction_type}, Change: ${balanceChange}, New Balance: ${currentBalance}`,
          );
        }

        // Store the running balance for this transaction
        balances[transaction.id] = currentBalance;
      }
    });

    console.log(
      `[calculatePepiBookBalance] Calculated balance: ${currentBalance}`,
    );
    return { finalBalance: currentBalance, balances };
  };

  const pepiBookBalance = useMemo(() => {
    const { finalBalance } = calculatePepiBookBalance();
    return finalBalance;
  }, [transactions, activeBook]);

  const handleEditRequest = (request: FundRequest) => {
    setRequestToEdit(request);
    setIsRequestFormOpen(true);
  };

  const handleRequestFormOpenChange = (open: boolean) => {
    setIsRequestFormOpen(open);
    if (!open) {
      setRequestToEdit(null);
    }
  };

  const isOwnItem = (
    item: TransactionListItem | FundRequest | TransactionWithAgent | null,
  ): boolean => {
    return (
      !!currentUserAgentId && !!item && item.agent_id === currentUserAgentId
    );
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (
      !confirm("Are you sure you want to permanently delete this fund request?")
    ) {
      return;
    }
    setProcessingId(requestId);
    try {
      const result = await deleteFundRequestAction(requestId);
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({ title: "Success", description: "Fund request deleted." });
      setCombinedList((prevList) =>
        prevList.filter((item) => item.id !== requestId),
      );
    } catch (err: any) {
      console.error("Error deleting request:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete request.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3">
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>

            {isAdmin && activeBook?.id && (
              <Dialog
                open={isCiPaymentFormOpen}
                onOpenChange={setIsCiPaymentFormOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <PlusCircle className="mr-2 h-4 w-4" /> New CI Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-4 md:p-6">
                  <DialogHeader>
                    <DialogTitle>New CI Payment (Admin)</DialogTitle>
                    <DialogDescription>
                      Fill out the form to record a Confidential Informant
                      payment. It will be submitted for approval.
                    </DialogDescription>
                  </DialogHeader>
                  {userId && activeBook && currentAgentData && (
                    <CiPaymentForm
                      userId={userId}
                      userRole={"admin"}
                      activeBookId={activeBook.id}
                      agentData={currentAgentData}
                      onFormSubmitSuccess={() => {
                        setIsCiPaymentFormOpen(false);
                        fetchTransactions();
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            )}

            {!isAdmin && (
              <>
                <Dialog
                  open={isRequestFormOpen}
                  onOpenChange={handleRequestFormOpenChange}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <PlusCircle className="mr-2 h-4 w-4" />{" "}
                      {requestToEdit ? "Edit Fund Request" : "Request Funds"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle>
                        {requestToEdit
                          ? "Edit Fund Request"
                          : "Request Additional Funds"}
                      </DialogTitle>
                      <DialogDescription>
                        {requestToEdit
                          ? "Update the details of your rejected request below."
                          : "Submit a request for more funds. Enter the amount and reason below."}
                      </DialogDescription>
                    </DialogHeader>
                    <FundRequestForm
                      initialData={requestToEdit || undefined}
                      onSuccess={() => {
                        setIsRequestFormOpen(false);
                        setRequestToEdit(null);
                        fetchTransactions();
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isCiPaymentFormOpen}
                  onOpenChange={setIsCiPaymentFormOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="secondary">
                      <PlusCircle className="mr-2 h-4 w-4" /> New CI Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-xs sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>New CI Payment</DialogTitle>
                      <DialogDescription>
                        Fill out the form to record a Confidential Informant
                        payment. It will be submitted for approval.
                      </DialogDescription>
                    </DialogHeader>
                    {userId && activeBook && currentAgentData && (
                      <CiPaymentForm
                        userId={userId}
                        userRole="agent"
                        activeBookId={activeBook.id}
                        agentData={currentAgentData}
                        onFormSubmitSuccess={() => {
                          setIsCiPaymentFormOpen(false);
                          fetchTransactions();
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </>
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
                {formatCurrency(pepiBookBalance)}
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
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by description, receipt number, or agent..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
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
      <CardContent className="px-4 sm:px-6 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredCombinedList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || filterType !== "all"
              ? "No matching transactions found"
              : "No transactions yet"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCombinedList.map((item: TransactionListItem) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 border rounded-lg 
                  ${item.itemType === "request" && item.status === "pending" ? "border-blue-300 bg-blue-50" : ""}
                  ${item.itemType === "request" && item.status === "rejected" ? "border-red-300 bg-red-50" : ""}
                  ${item.itemType === "transaction" && item.status === "pending" ? "border-orange-300 bg-orange-50" : ""}
                  ${item.itemType === "transaction" && item.status === "rejected" ? "border-red-300 bg-red-50" : ""}
                `}
              >
                <div className="flex items-center gap-3 flex-1 flex-wrap sm:flex-nowrap">
                  <div className="p-2 bg-muted rounded-full">
                    {item.itemType === "transaction" ? (
                      getTransactionIcon(item.transaction_type)
                    ) : item.status === "pending" ? (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : item.status === "rejected" ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.itemType === "transaction"
                        ? item.description?.startsWith(
                            "Approved fund request for",
                          )
                          ? `Issuance (Approved Request)`
                          : item.description ||
                            `Transaction ${item.id.substring(0, 8)}`
                        : `Fund Request (Case: ${item.case_number || "N/A"})`}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>
                        {item.itemType === "transaction"
                          ? getDisplayDate(item)
                          : formatDate(item.created_at)}
                      </span>
                      {item.agent?.name && (
                        <>
                          <span>•</span>
                          <span>
                            Agent: {item.agent.name}{" "}
                            {item.agent.badge_number
                              ? `(#${item.agent.badge_number})`
                              : ""}
                          </span>
                        </>
                      )}
                      {item.itemType === "transaction" &&
                        item.receipt_number && (
                          <>
                            <span>•</span>
                            <span>Receipt: {item.receipt_number}</span>
                          </>
                        )}
                      {item.itemType === "transaction" && item.document_url && (
                        <>
                          <span>•</span>
                          <a
                            href={item.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Paperclip className="h-3 w-3" />
                            <span>Document</span>
                          </a>
                        </>
                      )}
                      {item.itemType === "transaction" &&
                        item.transaction_type === "spending" &&
                        item.spending_category && (
                          <>
                            <span>•</span>
                            <span>Category: {item.spending_category}</span>
                          </>
                        )}
                    </div>
                    {item.itemType === "request" &&
                      item.status === "rejected" &&
                      item.rejection_reason && (
                        <div className="mt-1 p-2 text-xs bg-red-100 border border-red-200 text-red-800 rounded">
                          <strong>Rejection Reason:</strong>{" "}
                          {item.rejection_reason}
                        </div>
                      )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-4 w-full sm:w-auto">
                  <div className="text-right min-w-[150px] w-full sm:w-auto">
                    <div
                      className={`font-medium 
                        ${item.itemType === "transaction" && item.transaction_type === "issuance" ? "text-green-600" : ""}
                        ${item.itemType === "transaction" && item.transaction_type === "return" ? "text-green-600" : ""}
                        ${item.itemType === "transaction" && item.transaction_type === "spending" ? "text-red-600" : ""}
                        ${item.itemType === "request" ? "text-blue-600" : ""}
                      `}
                    >
                      {item.itemType === "transaction" &&
                      (item.transaction_type === "issuance" ||
                        item.transaction_type === "return")
                        ? "+"
                        : ""}
                      {item.itemType === "transaction" &&
                      item.transaction_type === "spending"
                        ? "-"
                        : ""}
                      {formatCurrency(Math.abs(item.amount))}
                    </div>
                    {/* Display running balance for transactions */}
                    {item.itemType === "transaction" && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Balance: {formatCurrency(runningBalances[item.id] || 0)}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 items-end mt-1">
                      {item.itemType === "transaction" ? (
                        getTransactionBadge(item.transaction_type)
                      ) : (
                        <Badge variant="outline">Request</Badge>
                      )}
                      {item.status && (
                        <TransactionStatus status={item.status as any} />
                      )}
                      {item.itemType === "request" &&
                        item.status === "rejected" &&
                        isOwnItem(item) && (
                          <Badge
                            variant="destructive"
                            className="animate-pulse"
                          >
                            Action Required
                          </Badge>
                        )}
                    </div>
                  </div>
                  {item.itemType === "transaction" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTransaction(item);
                        setIsDetailsOpen(true);
                      }}
                    >
                      View
                    </Button>
                  ) : item.itemType === "request" &&
                    isOwnItem(item) &&
                    (item.status === "pending" ||
                      item.status === "rejected") ? (
                    <>
                      {item.status === "rejected" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs px-2 h-7 mb-1"
                          onClick={() => handleEditRequest(item)}
                          disabled={processingId === item.id}
                        >
                          <Edit className="mr-1 h-3 w-3" /> Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-red-600 hover:bg-red-100 hover:text-red-700 text-xs px-2 h-7"
                        onClick={() => handleDeleteRequest(item.id)}
                        disabled={processingId === item.id}
                        title="Delete Request"
                      >
                        {processingId === item.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 h-3 w-3" />
                        )}
                        Delete
                      </Button>
                    </>
                  ) : (
                    <div className="w-[64px] h-[32px]"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 sm:px-6 border-t bg-card">
        {/* Footer can be empty or used for pagination later */}
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
            // Force a complete refresh of the data when a transaction is edited
            console.log("Transaction edited, refreshing data...");
            fetchTransactions();
            // Don't automatically close the dialog - let the TransactionDetails component handle this
          }}
        />
      )}
    </Card>
  );
}
