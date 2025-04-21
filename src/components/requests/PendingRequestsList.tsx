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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  approveFundRequestAction,
  rejectFundRequestAction,
} from "@/app/actions";

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
};

export default function PendingRequestsList() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch pending requests and join with agents and pepi_books tables
        const { data, error: fetchError } = await supabase
          .from("fund_requests")
          .select(`
            id,
            agent_id,
            pepi_book_id,
            amount,
            case_number,
            requested_at,
            agent:agents ( name ),
            pepi_book:pepi_books ( year )
          `)
          .eq("status", "pending")
          .order("requested_at", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        // Map data to include agent_name and pepi_book_year directly
        const formattedData: PendingRequest[] = data.map((req: any) => ({
          id: req.id,
          agent_id: req.agent_id,
          pepi_book_id: req.pepi_book_id,
          amount: req.amount,
          case_number: req.case_number,
          requested_at: req.requested_at,
          agent_name: req.agent?.name || 'Unknown Agent',
          pepi_book_year: req.pepi_book?.year || 0,
        }));

        setRequests(formattedData);

      } catch (err: any) {
        console.error("Error fetching pending requests:", err);
        setError(err.message || "Failed to load pending requests.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();

    // Set up a listener for real-time updates (optional but recommended)
    const channel = supabase
      .channel('fund_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fund_requests' },
        (payload) => {
          console.log('Change received!', payload);
          // Refetch data on any change to the table
          fetchRequests();
        }
      )
      .subscribe();

    // Cleanup function to remove the listener when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };

  }, [supabase]);

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
    try {
      const result = await approveFundRequestAction(requestId);
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({ title: "Success", description: "Fund request approved and transaction created." });
    } catch (err: any) {
      console.error("Error approving request:", err);
      toast({ title: "Error", description: err.message || "Failed to approve request.", variant: "destructive" });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const result = await rejectFundRequestAction(requestId);
      if (result?.error) {
        throw new Error(result.error);
      }
      toast({ title: "Success", description: "Fund request rejected." });
    } catch (err: any) {
      console.error("Error rejecting request:", err);
      toast({ title: "Error", description: err.message || "Failed to reject request.", variant: "destructive" });
    } finally {
      setProcessingRequestId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Fund Requests</CardTitle>
          <CardDescription>Review and process requests for funds.</CardDescription>
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
          <CardTitle>Pending Fund Requests</CardTitle>
          <CardDescription>Review and process requests for funds.</CardDescription>
        </CardHeader>
        <CardContent>
           <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Fund Requests</CardTitle>
        <CardDescription>Review and process requests for funds.</CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No pending requests.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Requested</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Case #</TableHead>
                <TableHead>PEPI Book</TableHead>
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
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingRequestId === request.id}
                    >
                      {processingRequestId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      disabled={processingRequestId === request.id}
                    >
                      {processingRequestId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
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