"use client";

import React from 'react';
import CiPaymentsHistoryList from '@/components/ci-payments/CiPaymentsHistoryList';
import { usePepiBooks } from '@/hooks/usePepiBooks'; // Assuming you have this hook
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function CiHistoryPage() {
    const { activeBook, loading: isBooksLoading } = usePepiBooks();

    if (isBooksLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading PEPI Book Data...</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
            {/* 
               You might want a more general PageHeader component here 
               similar to other dashboard pages 
            */}
            <h1 className="text-3xl font-bold mb-6">CI Payments History</h1>
            
            <CiPaymentsHistoryList activeBookId={activeBook ? activeBook.id : null} />
        </div>
    );
} 