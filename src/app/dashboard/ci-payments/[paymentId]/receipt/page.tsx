import React from 'react';
import { notFound } from 'next/navigation';
import { getCiPaymentForPrintAction } from '@/app/actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import PrintReceiptButton from './PrintReceiptButton'; // We will create this next

type ReceiptPageProps = {
    params: {
        paymentId: string;
    };
};

// Helper function for consistent date formatting
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "N/A";
    try {
        const date = parseISO(dateString);
        return format(date, "PPP p"); // e.g., Jan 1, 2023, 1:00:00 PM
    } catch (e) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Invalid Date";
            return format(date, "PPP p");
        } catch (e2) {
            return "Invalid Date";
        }
    }
};

// Helper function for currency formatting
const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};


export default async function CiPaymentReceiptPage({ params }: ReceiptPageProps) {
    const { paymentId } = params;

    if (!paymentId) {
        notFound();
    }

    const result = await getCiPaymentForPrintAction(paymentId);

    if (!result.success || !result.data) {
        // Handle error state - maybe show a specific error message
        // For now, just return notFound, RLS should prevent unauthorized access
        notFound();
    }

    const payment = result.data;

    // Basic Receipt Structure
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 print:p-0">
            <Card className="max-w-2xl mx-auto print:shadow-none print:border-none">
                <CardHeader className="text-center print:text-left">
                    <CardTitle className="text-2xl">Confidential Informant Payment Receipt</CardTitle>
                    <CardDescription>Receipt Number: {payment.receipt_number || 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 border-b pb-4">
                        <div><span className="font-semibold">Date Paid:</span> {formatDate(payment.date)}</div>
                        <div><span className="font-semibold">Amount Paid:</span> {formatCurrency(payment.amount_paid)}</div>
                        <div><span className="font-semibold">Paid To:</span> {payment.paid_to || 'N/A'}</div>
                         <div><span className="font-semibold">Case #:</span> {payment.case_number || 'N/A'}</div>
                        <div><span className="font-semibold">Paying Agent:</span> {payment.paying_agent?.name || payment.paying_agent_printed_name || 'N/A'}</div>
                         <div><span className="font-semibold">Badge #:</span> {payment.paying_agent?.badge_number || 'N/A'}</div>
                         <div><span className="font-semibold">PEPI Rec #:</span> {payment.pepi_receipt_number || 'N/A'}</div>
                    </div>

                    <h3 className="font-semibold text-lg pt-2">Signatures</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="border p-2 rounded">
                            <p className="text-sm font-medium mb-2">CI Signature</p>
                            {payment.ci_signature ? (
                                <Image src={payment.ci_signature} alt="CI Signature" width={150} height={75} className="mx-auto" />
                            ) : <p className="text-xs text-muted-foreground">N/A</p>}
                        </div>
                        <div className="border p-2 rounded">
                            <p className="text-sm font-medium mb-2">Paying Agent Signature</p>
                             {payment.paying_agent_signature ? (
                                <Image src={payment.paying_agent_signature} alt="Agent Signature" width={150} height={75} className="mx-auto" />
                            ) : <p className="text-xs text-muted-foreground">N/A</p>}
                        </div>
                        <div className="border p-2 rounded">
                            <p className="text-sm font-medium mb-2">Witness Signature</p>
                            {payment.witness_signature ? (
                                <Image src={payment.witness_signature} alt="Witness Signature" width={150} height={75} className="mx-auto" />
                            ) : <p className="text-xs text-muted-foreground">N/A</p>}
                             {payment.witness_printed_name && <p className="text-xs mt-1">({payment.witness_printed_name})</p>}
                        </div>
                    </div>

                     <div className="border p-2 rounded mt-4 text-center">
                        <p className="text-sm font-medium mb-2">Commander Approval Signature</p>
                         {payment.commander_signature ? (
                            <Image src={payment.commander_signature} alt="Commander Signature" width={150} height={75} className="mx-auto" />
                        ) : <p className="text-xs text-muted-foreground">N/A</p>}
                         <p className="text-xs mt-1">Approved By: {payment.reviewer?.name || 'N/A'}</p>
                         <p className="text-xs">Approved At: {formatDate(payment.reviewed_at)}</p>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end print:hidden">
                    <PrintReceiptButton />
                </CardFooter>
            </Card>
             {/* Basic Print Styles */}
             <style jsx global>{`
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                        font-size: 10pt;
                    }
                    .container {
                        padding: 0 !important;
                    }
                    header, footer, nav, aside, button {
                        display: none !important;
                    }
                    .print\:p-0 { padding: 0 !important; }
                    .print\:shadow-none { box-shadow: none !important; }
                    .print\:border-none { border: none !important; }
                    .print\:text-left { text-align: left !important; }
                    .print\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
} 