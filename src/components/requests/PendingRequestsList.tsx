"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Trash2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import TransactionApprovalHandler from "../transactions/TransactionApprovalHandler";
import {
  approveFundRequestAction,
  rejectFundRequestAction,
  deleteFundRequestAction,
} from "@/app/actions";
import { usePepiBooks } from "@/hooks/usePepiBooks";

// Define the structure of the fetched request data, including agent name
type PendingRequest = {
  id: string;
  agent_id: string;
  pepi_book_id: string;
  amount: number;
  case_number: string | null;
  requested_at: string;
  agent_name: string; // Added agent name
  pepi_book_year: number; // Added book year for context
  status?: string; // Added status field
  transaction_id?: string | null; // Added transaction_id field
};

export default function PendingRequestsList() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );
  const [emailStatus, setEmailStatus] = useState<
    { success: boolean; toastMessage: string } | undefined
  >();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();
  const { activeBook } = usePepiBooks();

  useEffect(() => {
    console.log(
      "[PendingRequestsList] Component mounted, fetching requests...",
    );
    fetchRequests();

    // No automatic refresh interval - removed to prevent disruption

    return () => {
      console.log("[PendingRequestsList] Component unmounting");
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    console.log("[PendingRequestsList] Fetching all pending requests...");

    try {
      // Only fetch pending fund requests
      console.log(
        "[PendingRequestsList] Executing database query for pending requests only...",
      );
      const { data, error: fetchError } = await supabase
        .from("fund_requests")
        .select(
          `
          id,
          agent_id,
          pepi_book_id,
          amount,
          case_number,
          requested_at,
          status,
          transaction_id,
          agent:agents!fund_requests_agent_id_fkey ( name ),
          pepi_book:pepi_books!fund_requests_pepi_book_id_fkey ( year )
        `,
        )
        .eq("status", "pending")
        .order("requested_at", { ascending: false });

      console.log("[PendingRequestsList] Query executed, raw result:", data);

      if (fetchError) {
        throw fetchError;
      }
      console.log(
        `[PendingRequestsList] Fetched raw data count: ${data?.length || 0}`,
      );
      console.log(
        "[PendingRequestsList] Raw data:",
        JSON.stringify(data, null, 2),
      );

      // Map data to include agent_name and pepi_book_year directly
      const formattedData: PendingRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        agent_id: req.agent_id,
        pepi_book_id: req.pepi_book_id,
        amount: req.amount,
        case_number: req.case_number,
        requested_at: req.requested_at,
        status: req.status,
        transaction_id: req.transaction_id,
        agent_name: req.agent?.name || "Unknown Agent",
        pepi_book_year: req.pepi_book?.year || 0,
      }));
      console.log(
        "[PendingRequestsList] Formatted Data:",
        JSON.stringify(formattedData, null, 2),
      );

      setRequests(formattedData);
    } catch (err: any) {
      console.error("Error fetching pending requests:", err);
      setError(err.message || "Failed to load pending requests.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRequests();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Pending requests have been refreshed.",
    });
  };

  useEffect(() => {
    // Set up realtime subscription to fund_requests table
    console.log("[PendingRequestsList] Setting up realtime subscription...");
    const channel = supabase
      .channel("fund_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fund_requests" },
        (payload) => {
          console.log("[PendingRequestsList] Change received!", payload);
          console.log("[PendingRequestsList] Refetching data due to change...");
          // Immediate fetch for better responsiveness
          fetchRequests();
        },
      )
      .subscribe();

    console.log("[PendingRequestsList] Realtime subscription active");

    return () => {
      console.log("[PendingRequestsList] Removing realtime subscription");
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleApprove = async (requestId: string) => {
    setProcessingRequestId(requestId);
    console.log(`[Client] Attempting to approve request with ID: ${requestId}`);
    try {
      const result = await approveFundRequestAction(requestId);
      if (result?.error) {
        throw new Error(result.error);
      }
      if (result?.emailStatus) {
        setEmailStatus(result.emailStatus);
      } else {
        toast({
          title: "Success",
          description: "Fund request approved and transaction created.",
        });
      }
      // Optimistically remove the approved request from the list
      setRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId),
      );
    } catch (err: any) {
      console.error("Error approving request:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to approve request.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    // Prompt for rejection reason
    const reason = prompt(
      "Please enter the reason for rejecting this request (optional):",
    );
    // If user cancels the prompt, reason will be null, which is handled by the server action

    setProcessingRequestId(requestId);
    try {
      // Pass the reason to the server action
      const result = await rejectFundRequestAction(requestId, reason);
      if (result?.error) {
        throw new Error(result.error);
      }
      if (result?.emailStatus) {
        setEmailStatus(result.emailStatus);
      } else {
        toast({ title: "Success", description: "Fund request rejected." });
      }
      // Optimistically remove the rejected request from the list
      setRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId),
      );
    } catch (err: any) {
      console.error("Error rejecting request:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to reject request.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (
      !confirm("Are you sure you want to permanently delete this fund request?")
    ) {
      return;
    }
    setProcessingRequestId(requestId);
    try {
      console.log(
        `[PendingRequestsList] Attempting to delete request ID: ${requestId}`,
      );
      const result = await deleteFundRequestAction(requestId);
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({ title: "Success", description: "Fund request deleted." });
      // Optimistically remove the deleted request from the list
      setRequests((prevRequests) =>
        prevRequests.filter((req) => req.id !== requestId),
      );
      console.log(
        `[PendingRequestsList] Successfully deleted request ID: ${requestId}`,
      );
    } catch (err: any) {
      console.error("Error deleting request:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete request.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fund Requests</CardTitle>
          <CardDescription>
            Review and process pending fund requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fund Requests</CardTitle>
          <CardDescription>
            Review and process pending fund requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={handleRefresh} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fund Requests</CardTitle>
          <CardDescription>
            Review and process pending fund requests.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="ml-auto"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No pending fund requests found.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Requested</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Case #</TableHead>
                <TableHead>PEPI Book</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{formatDate(request.requested_at)}</TableCell>
                  <TableCell>{request.agent_name}</TableCell>
                  <TableCell>{formatCurrency(request.amount)}</TableCell>
                  <TableCell>{request.case_number || "N/A"}</TableCell>
                  <TableCell>{request.pepi_book_year || "N/A"}</TableCell>
                  <TableCell>
                    <Badge className="mb-2">
                      {request.status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    {request.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          disabled={processingRequestId === request.id}
                        >
                          {processingRequestId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Approve"
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleReject(request.id)}
                          disabled={processingRequestId === request.id}
                        >
                          {processingRequestId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Reject"
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-100 hover:text-red-700"
                      onClick={() => handleDelete(request.id)}
                      disabled={processingRequestId === request.id}
                      title="Delete Request"
                    >
                      {processingRequestId === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
