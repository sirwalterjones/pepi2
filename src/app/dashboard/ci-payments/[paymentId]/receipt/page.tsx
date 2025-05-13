import React from 'react';
import { notFound } from 'next/navigation';
import { getCiPaymentForPrintAction } from '@/app/actions';
import CiReceiptDisplay from '@/components/ci-payments/CiReceiptDisplay'; // Import the new client component
import { createClient } from '@/../supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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

    // Check authentication first
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If not authenticated, show a sign-in prompt
    if (authError || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <div className="text-center space-y-4 max-w-md">
                    <h1 className="text-2xl font-bold">Authentication Required</h1>
                    <p className="text-gray-600">You need to be signed in to view this receipt.</p>
                    <Button asChild>
                        <Link href="/sign-in">Sign In</Link>
                    </Button>
                </div>
            </div>
        );
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