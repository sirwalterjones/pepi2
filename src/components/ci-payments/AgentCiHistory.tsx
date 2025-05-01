"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getCiPaymentHistoryAction,
  getCiPaymentForPrintAction,
} from "@/app/actions";
import { CiPayment, Agent } from "@/types/schema";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, FileSignature, Printer, Edit, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import CiReceiptDisplay from "@/components/ci-payments/CiReceiptDisplay";
import CiPaymentForm from "@/components/ci-payments/CiPaymentForm";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { createClient } from "@/../supabase/client";
import { useRouter } from "next/navigation";
import { badgeVariants } from "@/components/ui/badge";

type SignatureInfo = {
  title: string;
  dataUrl: string;
};

type AgentCiHistoryProps = {
  agentId: string;
  isAdmin: boolean;
};

export default function AgentCiHistory({
  agentId,
  isAdmin,
}: AgentCiHistoryProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { activeBook } = usePepiBooks();
  const [payments, setPayments] = useState<CiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureToView, setSignatureToView] = useState<SignatureInfo | null>(
    null,
  );
  const [isSignatureViewOpen, setIsSignatureViewOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] =
    useState<CiPayment | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<CiPayment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAgentFullData, setCurrentAgentFullData] =
    useState<Agent | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<CiPayment | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (agentId) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("agents")
          .select("*")
          .eq("id", agentId)
          .single();
        if (error) {
          console.error("Error fetching logged-in agent data:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load your agent details.",
          });
        } else {
          setCurrentAgentFullData(data as Agent);
        }
      }
    };
    fetchAgentData();
  }, [agentId, toast]);

  const fetchPayments = useCallback(async () => {
    if (!activeBook?.id) {
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getCiPaymentHistoryAction(
        activeBook.id,
        isAdmin ? null : agentId,
      );
      if (result.success && result.data) {
        setPayments(result.data);
      } else {
        setError(result.error || "Failed to fetch CI payment history.");
        setPayments([]);
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to fetch CI payment history.",
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setPayments([]);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeBook?.id, isAdmin, agentId, toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return format(date, "Pp");
    } catch (e) {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Invalid Date";
        return format(date, "Pp");
      } catch (e2) {
        return "Invalid Date";
      }
    }
  };

  const handleViewReceipt = async (payment: CiPayment) => {
    setLoadingReceipt(true);
    setSelectedPaymentForReceipt(payment);
    setIsReceiptModalOpen(true);
    setLoadingReceipt(false);
  };

  const handleOpenEditModal = (payment: CiPayment) => {
    setPaymentToEdit(payment);
    setIsEditModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsEditModalOpen(false);
    setPaymentToEdit(null);
    fetchPayments();
  };

  const handleViewSignature = (
    title: string,
    dataUrl: string | null | undefined,
  ) => {
    if (dataUrl) {
      setSignatureToView({ title, dataUrl });
      setIsSignatureViewOpen(true);
    } else {
      toast({
        title: "Signature Info",
        description: `${title} is not available for this payment.`,
      });
    }
  };

  const handlePrintReceipt = () => {
    document.body.classList.add("printing-receipt");

    window.print();

    setTimeout(() => {
      document.body.classList.remove("printing-receipt");
    }, 500);
  };

  const canEditPayment = (payment: CiPayment): boolean => {
    if (isAdmin) return true;
    return payment.paying_agent_id === agentId;
  };

  const canDeletePayment = (payment: CiPayment): boolean => {
    // Only admins can delete payments
    return isAdmin;
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("ci_payments")
        .delete()
        .eq("id", paymentToDelete.id);

      if (error) {
        throw new Error(error.message);
      }

      // Remove the deleted payment from the state
      setPayments(payments.filter((p) => p.id !== paymentToDelete.id));
      toast({
        title: "Success",
        description: `CI Payment #${paymentToDelete.receipt_number || ""} has been deleted.`,
      });

      // Refresh the page data
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete CI payment.",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleOpenDeleteDialog = (payment: CiPayment) => {
    setPaymentToDelete(payment);
    setIsDeleteDialogOpen(true);
  };

  const getStatusVariant = (
    status: string | null | undefined,
  ): BadgeProps["variant"] => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CI Payment History</CardTitle>
          <CardDescription>Loading payment history...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!activeBook?.id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CI Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please select an active PEPI Book to view history.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            Error Loading History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchPayments} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isAdmin ? "All CI Payments" : "My CI Payments"} ({payments.length})
        </CardTitle>
        <CardDescription>
          History of {isAdmin ? "all" : "your"} Confidential Informant payments
          for this book.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-muted-foreground">
            No CI payments found for this book.
          </p>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium">
                      Receipt: {payment.receipt_number || "N/A"}
                    </span>
                    <Badge variant={getStatusVariant(payment.status)}>
                      Status: {payment.status}
                    </Badge>
                    {payment.status === "approved" &&
                      payment.reviewer?.name && (
                        <Badge variant="secondary">
                          Approved By: {payment.reviewer.name}
                        </Badge>
                      )}
                    {payment.status === "rejected" &&
                      payment.reviewer?.name && (
                        <Badge variant="secondary">
                          Rejected By: {payment.reviewer.name}
                        </Badge>
                      )}
                  </div>
                  <p className="text-lg font-semibold">
                    Amount: {formatCurrency(payment.amount_paid)}
                  </p>
                  <p className="text-sm">Paid To: {payment.paid_to || "N/A"}</p>
                  <p className="text-sm">
                    Agent:{" "}
                    {payment.paying_agent?.name ||
                      payment.paying_agent_printed_name ||
                      "Unknown"}
                  </p>
                  {payment.case_number && (
                    <p className="text-sm">Case #: {payment.case_number}</p>
                  )}
                  {payment.pepi_receipt_number && (
                    <p className="text-sm">
                      PEPI Rec #: {payment.pepi_receipt_number}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Payment Date: {formatDate(payment.date)}
                  </p>
                  {payment.witness_printed_name && (
                    <p className="text-xs text-muted-foreground">
                      Witness: {payment.witness_printed_name}
                    </p>
                  )}
                  {payment.status === "rejected" &&
                    payment.rejection_reason && (
                      <div className="mt-1 p-2 text-xs bg-red-100 border border-red-200 text-red-800 rounded">
                        <strong>Rejection Reason:</strong>{" "}
                        {payment.rejection_reason}
                      </div>
                    )}

                  <div className="flex gap-2 flex-wrap text-xs pt-2">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        handleViewSignature(
                          "CI Signature",
                          payment.ci_signature,
                        )
                      }
                    >
                      CI Sig <FileSignature className="inline h-3 w-3 ml-1" />
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() =>
                        handleViewSignature(
                          "Paying Agent Signature",
                          payment.paying_agent_signature,
                        )
                      }
                    >
                      Agent Sig{" "}
                      <FileSignature className="inline h-3 w-3 ml-1" />
                    </Badge>
                    {payment.witness_signature && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() =>
                          handleViewSignature(
                            "Witness Signature",
                            payment.witness_signature,
                          )
                        }
                      >
                        Witness Sig{" "}
                        <FileSignature className="inline h-3 w-3 ml-1" />
                      </Badge>
                    )}
                    {payment.commander_signature && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() =>
                          handleViewSignature(
                            "Commander Signature",
                            payment.commander_signature,
                          )
                        }
                      >
                        Commander Sig{" "}
                        <FileSignature className="inline h-3 w-3 ml-1" />
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 pt-2 md:pt-0 flex flex-col sm:flex-row gap-2">
                  {canEditPayment(payment) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(payment)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  )}
                  {canDeletePayment(payment) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleOpenDeleteDialog(payment)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewReceipt(payment)}
                    disabled={loadingReceipt}
                  >
                    {loadingReceipt ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4 mr-1" />
                    )}
                    View/Print Receipt
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isSignatureViewOpen} onOpenChange={setIsSignatureViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{signatureToView?.title || "Signature"}</DialogTitle>
          </DialogHeader>
          <div className="py-4 flex justify-center items-center">
            {signatureToView?.dataUrl ? (
              <img
                src={signatureToView.dataUrl}
                alt={signatureToView.title}
                className="border rounded-md max-w-full h-auto max-h-64"
              />
            ) : (
              <p className="text-muted-foreground">Signature not available.</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] h-[85vh] max-h-[85vh] p-0 overflow-auto">
          <DialogHeader className="px-6 pt-6 pb-2 sticky top-0 bg-background z-10 border-b">
            <DialogTitle>CI Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-grow print:p-0 print:m-0 dialog-content">
            {selectedPaymentForReceipt && (
              <CiReceiptDisplay
                payment={selectedPaymentForReceipt}
                inModal={true}
              />
            )}
          </div>
          <DialogFooter className="px-6 py-4 sticky bottom-0 bg-background z-10 border-t flex flex-row justify-between sm:justify-end gap-2 dialog-footer">
            <Button onClick={handlePrintReceipt} className="flex-shrink-0">
              <Printer className="h-4 w-4 mr-1" /> Print Receipt
            </Button>
            <DialogClose asChild>
              <Button variant="outline" className="flex-shrink-0">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pt-4 px-4 md:pt-6 md:px-6 pb-2 border-b flex-shrink-0">
            <DialogTitle>Edit CI Payment</DialogTitle>
            <DialogDescription>
              Update the details for this Confidential Informant payment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto p-4 md:p-6">
            {paymentToEdit && currentAgentFullData && activeBook?.id && (
              <CiPaymentForm
                userId={agentId}
                userRole={isAdmin ? "admin" : "agent"}
                activeBookId={activeBook.id}
                agentData={currentAgentFullData}
                initialData={paymentToEdit}
                onFormSubmitSuccess={handleFormSuccess}
              />
            )}
            {(!paymentToEdit || !currentAgentFullData || !activeBook?.id) && (
              <div className="p-6 text-center text-muted-foreground">
                Loading form data...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CI Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this CI payment? This action
              cannot be undone.
              {paymentToDelete && (
                <div className="mt-2 p-3 border rounded-md bg-muted">
                  <p>
                    <strong>Receipt #:</strong>{" "}
                    {paymentToDelete.receipt_number || "N/A"}
                  </p>
                  <p>
                    <strong>Amount:</strong>{" "}
                    {formatCurrency(paymentToDelete.amount_paid)}
                  </p>
                  <p>
                    <strong>Paid To:</strong> {paymentToDelete.paid_to || "N/A"}
                  </p>
                  <p>
                    <strong>Date:</strong> {formatDate(paymentToDelete.date)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
