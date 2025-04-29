"use client";

import React, { useState, useEffect } from "react";
import {
  getApprovedCiPaymentsAction,
  getCiPaymentForPrintAction,
} from "@/app/actions";
import { CiPayment } from "@/types/schema";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  FileSignature,
  Printer,
  Upload,
  Paperclip,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Image from "next/image"; // Use Next.js Image for potential optimization
import CiReceiptDisplay from "@/components/ci-payments/CiReceiptDisplay";

// Type definition for the signature to display
type SignatureInfo = {
  title: string;
  dataUrl: string;
};

type CiPaymentsHistoryListProps = {
  activeBookId: string | null;
};

export default function CiPaymentsHistoryList({
  activeBookId,
}: CiPaymentsHistoryListProps) {
  const { toast } = useToast();
  const [approvedPayments, setApprovedPayments] = useState<CiPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureToView, setSignatureToView] = useState<SignatureInfo | null>(
    null,
  );
  const [isSignatureViewOpen, setIsSignatureViewOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CiPayment | null>(
    null,
  );
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const fetchApprovedPayments = async () => {
    if (!activeBookId) {
      setApprovedPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getApprovedCiPaymentsAction(activeBookId);
      if (result.success && result.data) {
        setApprovedPayments(result.data);
      } else {
        setError(result.error || "Failed to fetch approved CI payments.");
        setApprovedPayments([]);
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to fetch approved CI payments.",
        });
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setApprovedPayments([]);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedPayments();
    // Consider adding a real-time subscription here as well if needed, similar to pending list
  }, [activeBookId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return format(date, "Pp"); // Format as 'MMM d, yyyy, h:mm:ss a' for more precision if needed
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

  // Function to open the signature view dialog
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

  // Function to view receipt in modal
  const handleViewReceipt = async (paymentId: string) => {
    setLoadingReceipt(true);
    try {
      const result = await getCiPaymentForPrintAction(paymentId);
      if (result.success && result.data) {
        setSelectedPayment(result.data);
        setIsReceiptModalOpen(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error Loading Receipt",
          description: result.error || "Failed to load receipt data.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          err.message || "An unexpected error occurred loading the receipt.",
      });
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Function to print the receipt from the modal
  const handlePrintReceipt = () => {
    // Add a class to help with print styling
    document.body.classList.add("printing-receipt");

    // Print the document
    window.print();

    // Remove the class after printing
    setTimeout(() => {
      document.body.classList.remove("printing-receipt");
    }, 500);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approved CI Payments History</CardTitle>
          <CardDescription>Loading approved payment history...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!activeBookId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approved CI Payments History</CardTitle>
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
          <Button
            variant="outline"
            onClick={fetchApprovedPayments}
            className="mt-4"
          >
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
          Approved CI Payments History ({approvedPayments.length})
        </CardTitle>
        <CardDescription>
          History of approved Confidential Informant payments for this book.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {approvedPayments.length === 0 ? (
          <p className="text-muted-foreground">
            No approved CI payments found for this book.
          </p>
        ) : (
          <div className="space-y-4">
            {approvedPayments.map((payment) => (
              <div
                key={payment.id}
                className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start gap-4"
              >
                <div className="flex-1 space-y-2">
                  {/* Payment Details */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium">
                      Receipt: {payment.receipt_number || "N/A"}
                    </span>
                    <Badge variant="outline">
                      Approved: {formatDate(payment.reviewed_at)}
                    </Badge>
                    <Badge variant="secondary">
                      By: {payment.reviewer?.name || "Unknown"}
                    </Badge>
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
                  {payment.document_url && (
                    <a
                      href={payment.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Upload className="h-3 w-3" /> Supporting Document
                    </a>
                  )}

                  {/* Signature Links/Badges */}
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
                  </div>
                </div>
                {/* Action Button */}
                <div className="flex-shrink-0 pt-2 md:pt-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleViewReceipt(payment.id)}
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

      {/* Signature View Dialog */}
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

      {/* Receipt Modal */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-[95vw] w-full md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw] h-[85vh] max-h-[85vh] p-0 overflow-auto">
          <DialogHeader className="px-6 pt-6 pb-2 sticky top-0 bg-background z-10 border-b">
            <DialogTitle>CI Payment Receipt</DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto flex-grow print:p-0 print:m-0 dialog-content">
            {selectedPayment && (
              <CiReceiptDisplay payment={selectedPayment} inModal={true} />
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
    </Card>
  );
}
