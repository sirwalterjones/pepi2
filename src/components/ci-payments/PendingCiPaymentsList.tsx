"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPendingCiPaymentsAction, approveCiPaymentAction, rejectCiPaymentAction } from '@/app/actions';
import { CiPayment, Agent } from '@/types/schema';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, FileSignature } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import SignatureCanvas from 'react-signature-canvas';
import { Label } from '@/components/ui/label';
import { createClient } from '@/../supabase/client'; // Import Supabase client

// Type definition for the signature to display
type SignatureInfo = {
    title: string;
    dataUrl: string;
};

type PendingCiPaymentsListProps = {
    activeBookId: string | null;
};

export default function PendingCiPaymentsList({ activeBookId }: PendingCiPaymentsListProps) {
    const { toast } = useToast();
    const [pendingPayments, setPendingPayments] = useState<CiPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [selectedPaymentForAction, setSelectedPaymentForAction] = useState<CiPayment | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const commanderSigRef = useRef<SignatureCanvas>(null);
    const supabase = createClient(); // Initialize Supabase client
    const [signatureToView, setSignatureToView] = useState<SignatureInfo | null>(null); // State for signature view dialog
    const [isSignatureViewOpen, setIsSignatureViewOpen] = useState(false);

    const fetchPendingPayments = async () => {
        if (!activeBookId) {
            setPendingPayments([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const result = await getPendingCiPaymentsAction(activeBookId);
            if (result.success && result.data) {
                setPendingPayments(result.data);
            } else {
                setError(result.error || "Failed to fetch pending CI payments.");
                setPendingPayments([]);
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred.");
            setPendingPayments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingPayments();

        // Set up real-time subscription
        const channel = supabase
            .channel('ci_payments_pending_list_changes')
            .on(
                'postgres_changes',
                { 
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'ci_payments',
                    // Filter on the server-side if possible, e.g., filter: `book_id=eq.${activeBookId}`
                    // However, complex client-side logic might still be needed based on status changes
                },
                (payload) => {
                    console.log('CI Payment change detected:', payload);
                    // Refetch data on any change. Could be optimized to check status/book_id.
                    fetchPendingPayments(); 
                }
            )
            .subscribe();

        // Cleanup subscription on component unmount
        return () => {
            supabase.removeChannel(channel);
        };

    }, [activeBookId, supabase]); // Add supabase to dependency array

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "N/A";
        try {
             // Try parsing as ISO string first, then fall back
             const date = parseISO(dateString); 
             return format(date, "PPP"); // Format as 'MMM d, yyyy'
        } catch (e) {
             try {
                 // Fallback for potentially different date formats (e.g., just 'yyyy-MM-dd')
                 const date = new Date(dateString);
                 // Check if the date is valid after parsing
                 if (isNaN(date.getTime())) {
                     return "Invalid Date";
                 }
                 return format(date, "PPP");
             } catch (e2) {
                  return "Invalid Date";
             }
        }
    };

    const handleOpenRejectDialog = (payment: CiPayment) => {
        setSelectedPaymentForAction(payment);
        setRejectionReason("");
        setIsRejectDialogOpen(true);
    };

    const handleOpenApproveDialog = (payment: CiPayment) => {
        setSelectedPaymentForAction(payment);
        commanderSigRef.current?.clear(); // Clear previous signature
        setIsApproveDialogOpen(true);
    };

    // Function to open the signature view dialog
    const handleViewSignature = (title: string, dataUrl: string | null | undefined) => {
        if (dataUrl) {
            setSignatureToView({ title, dataUrl });
            setIsSignatureViewOpen(true);
        }
    };

    const handleRejectSubmit = async () => {
        if (!selectedPaymentForAction || !rejectionReason) return;
        setProcessingId(selectedPaymentForAction.id);
        setError(null);
        try {
            const result = await rejectCiPaymentAction(selectedPaymentForAction.id, rejectionReason);
            if (result.success) {
                toast({ title: "Success", description: "CI Payment rejected." });
                setIsRejectDialogOpen(false);
                fetchPendingPayments(); // Re-fetch the list
            } else {
                throw new Error(result.error || "Failed to reject payment.");
            }
        } catch (err: any) {
            setError(err.message);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const handleApproveSubmit = async () => {
        if (!selectedPaymentForAction) {
            toast({ title: "Error", description: "No payment selected for approval.", variant: "destructive" });
            return;
        }

        // --- Revised Signature Retrieval Logic ---
        let signatureData: string | undefined;
        try {
            if (!commanderSigRef || !commanderSigRef.current) {
                throw new Error("Commander signature canvas is not available.");
            }
            if (typeof commanderSigRef.current.isEmpty === 'function' && commanderSigRef.current.isEmpty()) {
                toast({ title: "Error", description: "Commander signature is required.", variant: "destructive" });
                return; // Stop processing if required signature is empty
            }
            if (typeof commanderSigRef.current.getCanvas !== 'function') {
                throw new Error("Internal error: Cannot access signature canvas.");
            }

            const canvas = commanderSigRef.current.getCanvas();
            if (!(canvas instanceof HTMLCanvasElement)) {
                 throw new Error("Internal error: Failed to get signature canvas element.");
            }
            if (typeof canvas.toDataURL !== 'function') {
                 throw new Error("Internal error: Cannot export signature data.");
            }

            signatureData = canvas.toDataURL('image/png');

            if (!signatureData) { // Double check if toDataURL somehow failed
                throw new Error("Failed to generate signature image data.");
            }

        } catch (sigError: any) {
            console.error("Error getting commander signature:", sigError);
            toast({ 
                 variant: "destructive",
                 title: "Signature Error",
                 description: sigError.message || "Could not read commander signature. Please try again.",
             });
             // Do not proceed with approval if signature failed
            return; 
        }
        // --- End Revised Signature Retrieval Logic ---

        // Proceed with approval now that signatureData is confirmed
        setProcessingId(selectedPaymentForAction.id);
        setError(null);
        try {
            const result = await approveCiPaymentAction(selectedPaymentForAction.id, signatureData);
            if (result.success) {
                toast({ title: "Success", description: "CI Payment approved." });
                setIsApproveDialogOpen(false);
                fetchPendingPayments(); // Re-fetch the list
            } else {
                throw new Error(result.error || "Failed to approve payment.");
            }
        } catch (err: any) {
            setError(err.message);
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setProcessingId(null);
        }
    };

    const signaturePadOptions = {
        penColor: 'black',
        backgroundColor: 'rgb(248 250 252)', // slate-50 or similar
        minWidth: 1,
        maxWidth: 2,
   };


    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Pending CI Payments</CardTitle>
                    <CardDescription>Loading pending payments for review...</CardDescription>
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
                    <CardTitle>Pending CI Payments</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Please select an active PEPI Book to view pending CI payments.</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Payments</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">{error}</p>
                    <Button variant="outline" onClick={fetchPendingPayments} className="mt-4">
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending CI Payments ({pendingPayments.length})</CardTitle>
                <CardDescription>Review and approve or reject pending Confidential Informant payments.</CardDescription>
            </CardHeader>
            <CardContent>
                {pendingPayments.length === 0 ? (
                    <p className="text-muted-foreground">No pending CI payments found for this book.</p>
                ) : (
                    <div className="space-y-4">
                        {pendingPayments.map((payment) => (
                            <div key={payment.id} className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                        <span className="font-medium">Receipt: {payment.receipt_number || 'N/A'}</span>
                                        <Badge variant="outline">Date: {formatDate(payment.date)}</Badge>
                                        <Badge variant="secondary">Agent: {payment.paying_agent?.name || payment.paying_agent_printed_name || 'Unknown'}</Badge>
                                    </div>
                                    <p className="text-lg font-semibold">Amount: {formatCurrency(payment.amount_paid)}</p>
                                    {payment.case_number && <p className="text-sm">Case #: {payment.case_number}</p>}
                                    {payment.pepi_receipt_number && <p className="text-sm">PEPI Rec #: {payment.pepi_receipt_number}</p>}
                                    {/* Add Signature previews/links later */}
                                     <div className="flex gap-2 flex-wrap text-xs pt-2">
                                          {payment.ci_signature && 
                                                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => handleViewSignature('CI Signature', payment.ci_signature)}>
                                                    CI Sig <FileSignature className='inline h-3 w-3 ml-1' />
                                                </Badge>}
                                          {payment.paying_agent_signature && 
                                                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => handleViewSignature('Paying Agent Signature', payment.paying_agent_signature)}>
                                                    Agent Sig <FileSignature className='inline h-3 w-3 ml-1' />
                                                </Badge>}
                                          {payment.witness_signature && 
                                                <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => handleViewSignature('Witness Signature', payment.witness_signature)}>
                                                    Witness Sig <FileSignature className='inline h-3 w-3 ml-1' />
                                                </Badge>}
                                     </div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-2 pt-2 md:pt-0 md:items-center flex-shrink-0">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleOpenRejectDialog(payment)}
                                        disabled={processingId === payment.id}
                                    >
                                        {processingId === payment.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />} Reject
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleOpenApproveDialog(payment)}
                                        disabled={processingId === payment.id}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {processingId === payment.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />} Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Rejection Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject CI Payment</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this payment (ID: {selectedPaymentForAction?.id.substring(0, 8)}...).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Enter rejection reason..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleRejectSubmit}
                            disabled={!rejectionReason || !!processingId}
                        >
                            {processingId === selectedPaymentForAction?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approval Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Approve CI Payment</DialogTitle>
                        <DialogDescription>
                            Provide the Commander's signature to approve this payment (ID: {selectedPaymentForAction?.id.substring(0, 8)}...). Amount: {formatCurrency(selectedPaymentForAction?.amount_paid || 0)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                         <Label htmlFor="commander_signature">Commander Signature</Label>
                         <div className="border rounded-md bg-slate-50">
                             <SignatureCanvas 
                                ref={commanderSigRef} 
                                canvasProps={{ id: 'commander_signature', className: 'w-full h-40' }} 
                                {...signaturePadOptions} 
                             />
                         </div>
                         <Button type="button" variant="outline" size="sm" onClick={() => commanderSigRef.current?.clear()}>Clear Signature</Button>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleApproveSubmit}
                            disabled={!!processingId}
                            className="bg-green-600 hover:bg-green-700"
                        >
                           {processingId === selectedPaymentForAction?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                            Confirm Approval
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Signature View Dialog */}
            <Dialog open={isSignatureViewOpen} onOpenChange={setIsSignatureViewOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{signatureToView?.title || 'Signature'}</DialogTitle>
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
        </Card>
    );
} 