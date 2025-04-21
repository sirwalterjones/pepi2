"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Transaction, TransactionType, TransactionWithAgent, FundRequest } from "@/types/schema";
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

// Define a type for the combined list items
type TransactionListItem = (TransactionWithAgent & { itemType: 'transaction' }) | 
                         (FundRequest & { 
                             itemType: 'request'; 
                             created_at: string; // Ensure created_at exists for sorting 
                             agent?: { id: string; name: string; badge_number: string | null } | null; // Make agent optional
                         });

export default function TransactionList() {
  // Function to check if a transaction belongs to the current user
  const isOwnTransaction = (transaction: any) => {
    return currentUserAgentId && transaction.agent_id === currentUserAgentId;
  };
  const [transactions, setTransactions] = useState<TransactionWithAgent[]>([]);
  const [requests, setRequests] = useState<FundRequest[]>([]);
  const [combinedList, setCombinedList] = useState<TransactionListItem[]>([]);
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
  const [requestToEdit, setRequestToEdit] = useState<FundRequest | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const fetchData = async () => {
    if ((!isAdmin && !currentUserAgentId) || !activeBook?.id) {
        setLoading(false);
        return;
    }
    
    setLoading(true);
    try {
      let transactionQuery = supabase
        .from("transactions")
        .select(`
          *,
          agent:agents!transactions_agent_id_fkey ( id, name, badge_number )
        `)
        .order("created_at", { ascending: false });

      transactionQuery = transactionQuery.eq("pepi_book_id", activeBook.id);

      if (filterType !== "all") {
        transactionQuery = transactionQuery.eq("transaction_type", filterType);
      }

      if (!isAdmin && currentUserAgentId) {
        transactionQuery = transactionQuery.eq("agent_id", currentUserAgentId);
      }

      const { data: transactionData, error: transactionError } = await transactionQuery;

      if (transactionError) {
        console.error("Error fetching transactions:", transactionError);
        toast({ title: "Error fetching transactions", description: transactionError.message, variant: "destructive" });
      }
      const fetchedTransactions = (transactionData as TransactionWithAgent[]) || [];
      setTransactions(fetchedTransactions);

      let fetchedRequests: FundRequest[] = [];
      if (!isAdmin && currentUserAgentId) {
          const { data: requestData, error: requestError } = await supabase
              .from("fund_requests")
              .select(`*, agent:agents!fund_requests_agent_id_fkey(id, name, badge_number)`)
              .eq("agent_id", currentUserAgentId)
              .eq("pepi_book_id", activeBook.id)
              .in("status", ["pending", "rejected"]);
          
          if (requestError) {
              console.error("Error fetching fund requests:", requestError);
              toast({ title: "Error fetching fund requests", description: requestError.message, variant: "destructive" });
          } else {
              fetchedRequests = (requestData as FundRequest[]) || [];
              setRequests(fetchedRequests);
          }
      }
      
      const combined: TransactionListItem[] = [
          ...fetchedTransactions.map(t => ({ ...t, itemType: 'transaction' as const })),
          ...fetchedRequests.map(r => ({
               ...r,
               itemType: 'request' as const,
               created_at: r.requested_at,
               agent: (r as any).agent || null 
           }))
      ];

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCombinedList(combined);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: error.message || "Failed to fetch data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, activeBook?.id, currentUserAgentId, isAdmin]);

  useEffect(() => {
    if ((!isAdmin && !currentUserAgentId) || !activeBook?.id) return;

    const transactionChannel = supabase
      .channel('transactions_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
        () => { console.log('Transaction change detected, refetching data...'); fetchData(); }
      ).subscribe();
      
    const requestChannel = supabase
      .channel('requests_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_requests' }, 
        () => { console.log('Fund request change detected, refetching data...'); fetchData(); }
      ).subscribe();

    return () => {
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(requestChannel);
    };
  }, [supabase, activeBook?.id, currentUserAgentId, isAdmin]);

  // Filter the combined list now using the specific type
  const filteredCombinedList = combinedList.filter((item: TransactionListItem) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      
      // Base check for agent name/badge
      const agentMatch = item.agent?.name?.toLowerCase().includes(term) || 
                         item.agent?.badge_number?.toLowerCase().includes(term);

      if (item.itemType === 'transaction') {
          return (
              agentMatch ||
              item.description?.toLowerCase().includes(term) ||
              item.receipt_number?.toLowerCase().includes(term)
          );
      } else { // item.itemType === 'request' guaranteed by type definition
          return (
              agentMatch ||
              item.case_number?.toLowerCase().includes(term) ||
              item.status?.toLowerCase().includes(term) ||
              item.rejection_reason?.toLowerCase().includes(term) ||
              item.amount?.toString().includes(term) 
          );
      }
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

  // Update balance calculation to only use transactions
  const calculateAgentBalance = () => {
    if (!currentUserAgentId || !transactions.length) return 0;

    let balance = 0;
    transactions.forEach((transaction: TransactionWithAgent) => { // Use original transactions state
      if (
        transaction.agent_id === currentUserAgentId &&
        (transaction.status === "approved" || transaction.status === "pending") // Only approved/pending transactions affect balance?
      ) {
        if (transaction.transaction_type === "issuance") {
          balance += transaction.amount;
        } else if (transaction.transaction_type === "spending") {
          balance -= transaction.amount;
        } else if (transaction.transaction_type === "return") {
          // Assuming return decreases agent balance
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

  // Function to handle opening the edit form
  const handleEditRequest = (request: FundRequest) => {
      setRequestToEdit(request);
      setIsRequestFormOpen(true); // Open the same dialog used for new requests
  };
  
  // Reset requestToEdit when dialog closes
  const handleRequestFormOpenChange = (open: boolean) => {
      setIsRequestFormOpen(open);
      if (!open) {
          setRequestToEdit(null);
      }
  }

  // Re-purpose isOwnTransaction to check request/transaction ownership based on agent_id
  const isOwnItem = (item: TransactionListItem | FundRequest | TransactionWithAgent | null): boolean => {
    return !!currentUserAgentId && !!item && item.agent_id === currentUserAgentId;
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to permanently delete this fund request?")) {
      return;
    }
    setProcessingId(requestId); // Use processing state
    try {
      const result = await deleteFundRequestAction(requestId);
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({ title: "Success", description: "Fund request deleted." });
      // Optimistically remove the item from the list
      setCombinedList((prevList) => 
        prevList.filter((item) => item.id !== requestId)
      );
      // List should refresh via real-time subscription eventually anyway
    } catch (err: any) {
      console.error("Error deleting request:", err);
      toast({ title: "Error", description: err.message || "Failed to delete request.", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

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
                  ${item.itemType === 'request' && item.status === 'pending' ? 'border-blue-300 bg-blue-50' : ''}
                  ${item.itemType === 'request' && item.status === 'rejected' ? 'border-red-300 bg-red-50' : ''}
                  ${item.itemType === 'transaction' && item.status === 'rejected' ? 'border-red-300 bg-red-50' : ''}
                `}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-muted rounded-full">
                    {item.itemType === 'transaction' 
                      ? getTransactionIcon(item.transaction_type) 
                      : item.status === 'pending' 
                          ? <Loader2 className="h-4 w-4 text-blue-600 animate-spin" /> 
                          : item.status === 'rejected'
                              ? <XCircle className="h-4 w-4 text-red-600" /> 
                              : <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.itemType === 'transaction' 
                        ? item.description || `Transaction ${item.id.substring(0, 8)}`
                        : `Fund Request (Case: ${item.case_number || 'N/A'})`}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span>{formatDate(item.created_at)}</span>
                      {item.agent?.name && (
                        <>
                          <span>•</span>
                          <span>Agent: {item.agent.name} {item.agent.badge_number ? `(#${item.agent.badge_number})` : ''}</span>
                        </>
                      )}
                      {item.itemType === 'transaction' && item.receipt_number && (
                        <>
                          <span>•</span>
                          <span>Receipt: {item.receipt_number}</span>
                        </>
                      )}
                    </div>
                    {item.itemType === 'request' && item.status === 'rejected' && item.rejection_reason && (
                        <div className="mt-1 p-2 text-xs bg-red-100 border border-red-200 text-red-800 rounded">
                            <strong>Rejection Reason:</strong> {item.rejection_reason}
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="text-right">
                    <div
                      className={`font-medium 
                        ${item.itemType === 'transaction' && item.transaction_type === "issuance" ? "text-green-600" : ''}
                        ${item.itemType === 'transaction' && item.transaction_type === "return" ? "text-green-600" : ''}
                        ${item.itemType === 'transaction' && item.transaction_type === "spending" ? "text-red-600" : ''}
                        ${item.itemType === 'request' ? 'text-blue-600' : ''}
                      `}
                    >
                      {item.itemType === 'transaction' && (item.transaction_type === "issuance" || item.transaction_type === "return") ? "+" : ''}
                      {item.itemType === 'transaction' && item.transaction_type === "spending" ? "-" : ''}
                      {formatCurrency(Math.abs(item.amount))}
                    </div>
                    <div className="flex flex-col gap-1 items-end mt-1">
                      {item.itemType === 'transaction' 
                          ? getTransactionBadge(item.transaction_type) 
                          : <Badge variant="outline">Request</Badge>
                      }
                      {item.status && <TransactionStatus status={item.status as any} />}
                      {item.itemType === 'request' && item.status === "rejected" && isOwnItem(item) && (
                        <Badge variant="destructive" className="animate-pulse">
                          Action Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.itemType === 'transaction' ? (
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
                  ) : item.itemType === 'request' && isOwnItem(item) && (item.status === 'pending' || item.status === 'rejected') ? (
                    <>
                        {item.status === 'rejected' && (
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
                            {processingId === item.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" /> }
                            Delete
                        </Button>
                    </>
                  ) : (
                      <div className="w-[64px] h-[32px]"></div>
                  ) }
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
        onTransactionCreated={fetchData}
      />

      {selectedTransaction && (
        <TransactionDetails
          transaction={selectedTransaction}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          onDelete={fetchData}
          onEdit={() => {
            fetchData();
            setIsDetailsOpen(false);
          }}
        />
      )}

      <Dialog open={isRequestFormOpen} onOpenChange={handleRequestFormOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                  <DialogTitle>{requestToEdit ? 'Edit Fund Request' : 'Request Additional Funds'}</DialogTitle>
                  <DialogDescription>
                      {requestToEdit ? 'Update the details of your rejected request below.' : 'Submit a request for more funds. Enter the amount and reason below.'}
                  </DialogDescription>
              </DialogHeader>
              <FundRequestForm 
                  initialData={requestToEdit || undefined} 
                  onSuccess={() => {
                      setIsRequestFormOpen(false);
                      setRequestToEdit(null);
                      fetchData();
                  }} 
              />
          </DialogContent>
      </Dialog>
    </Card>
  );
}
