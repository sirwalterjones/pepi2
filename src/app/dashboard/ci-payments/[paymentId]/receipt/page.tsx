import React from 'react';
import { notFound } from 'next/navigation';
import { getCiPaymentForPrintAction } from '@/app/actions';
import CiReceiptDisplay from '@/components/ci-payments/CiReceiptDisplay'; // Import the new client component

type ReceiptPageProps = {
    params: {
        paymentId: string;
    };
};

// This remains a Server Component to fetch data
export default async function CiPaymentReceiptPage({ params }: ReceiptPageProps) {
    const { paymentId } = params;

    if (!paymentId) {
        notFound();
    }

    const result = await getCiPaymentForPrintAction(paymentId);

    if (!result.success || !result.data) {
        // RLS should prevent unauthorized access, but handle data not found
        console.error(`[Receipt Page] Failed to fetch payment data for ID: ${paymentId}. Error: ${result.error}`);
        notFound(); // Or return an error message component
    }

    const payment = result.data;

    // Render the Client Component, passing the fetched data
    return <CiReceiptDisplay payment={payment} />;
} 