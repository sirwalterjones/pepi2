'use client';

import React, { useState, useEffect } from 'react';
import { usePepiBooks } from '@/hooks/usePepiBooks';
import { getMonthlyPepiMemoDataAction, MonthlyPepiMemoData } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Import the memo display component (will create this next)
import MonthlyPepiMemo from '@/components/reports/MonthlyPepiMemo';

export default function CbMemoReportPage() {
    const { activeBook } = usePepiBooks();
    const { toast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [memoData, setMemoData] = useState<MonthlyPepiMemoData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableMonths, setAvailableMonths] = useState<{ value: number; label: string }[]>([]);

    useEffect(() => {
        // Populate available months when active book changes
        if (activeBook) {
            const months = [];
            const year = activeBook.year; // Assuming year is directly available
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1; // 1-12

            for (let i = 1; i <= 12; i++) {
                 // Only allow selecting months up to the current month if it's the current year
                if (year < currentYear || (year === currentYear && i <= currentMonth)) {
                    const monthDate = new Date(Date.UTC(year, i - 1, 1));
                    const monthLabel = monthDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
                    months.push({ value: i, label: `${monthLabel} ${year}` });
                } 
            }
            setAvailableMonths(months);
            // Reset selection if book changes
            setSelectedMonth(null);
            setMemoData(null);
            setError(null);
        } else {
            setAvailableMonths([]);
            setSelectedMonth(null);
            setMemoData(null);
            setError(null);
        }
    }, [activeBook]);

    const handleGenerateMemo = async () => {
        if (!activeBook || selectedMonth === null) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an active PEPI Book and a month.' });
            return;
        }

        setLoading(true);
        setError(null);
        setMemoData(null);

        try {
            const result = await getMonthlyPepiMemoDataAction(activeBook.id, selectedMonth);
            if (result.success && result.data) {
                setMemoData(result.data);
            } else {
                setError(result.error || 'Failed to generate memo data.');
                toast({ variant: 'destructive', title: 'Error Generating Memo', description: result.error });
            }
        } catch (err: any) {
            setError('An unexpected error occurred while generating the memo.');
            toast({ variant: 'destructive', title: 'Unexpected Error', description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (memoData) {
            // Add a class to the body or a wrapper div to control print styles via CSS
            document.body.classList.add('printing-memo');
            window.print();
            // Remove class after print dialog is likely closed
            setTimeout(() => document.body.classList.remove('printing-memo'), 500);
        } else {
            toast({ title: 'Cannot Print', description: 'Please generate a memo first.'}) 
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <h1 className="text-2xl font-semibold">Monthly PEPI Reconciliation Memo (CB Memo)</h1>
            
            {!activeBook ? (
                <p className="text-muted-foreground">Please select an active PEPI Book first.</p>
            ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                    <div className='flex-1'>
                         <label htmlFor="month-select" className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                        <Select 
                            value={selectedMonth !== null ? String(selectedMonth) : ''} 
                            onValueChange={(value) => setSelectedMonth(value ? Number(value) : null)}
                            disabled={loading}
                        >
                            <SelectTrigger id="month-select" className="w-full sm:w-[250px]">
                                <SelectValue placeholder="Select a month..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableMonths.map(month => (
                                    <SelectItem key={month.value} value={String(month.value)}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                                {availableMonths.length === 0 && <p className="p-4 text-sm text-muted-foreground">No months available for this book yet.</p>}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={handleGenerateMemo}
                        disabled={loading || selectedMonth === null}
                        className='w-full sm:w-auto'
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generate Memo
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={handlePrint}
                        disabled={loading || !memoData}
                        className='w-full sm:w-auto'
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Print Memo
                    </Button>
                </div>
            )}

            {error && (
                <p className="text-red-600">Error: {error}</p>
            )}

            {/* Memo Display Area */}
            <div id="memo-content-area" className="mt-6 border rounded-lg p-4 bg-white print:border-none print:shadow-none print:p-0">
                {loading && (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3">Generating memo data...</span>
                    </div>
                )}
                {!loading && !memoData && !error && (
                     <p className="text-center text-muted-foreground py-10">Select a month and click "Generate Memo" to view the report.</p>
                )}
                {memoData && (
                    <MonthlyPepiMemo data={memoData} />
                )}
            </div>

            {/* Print-specific styles (can be moved to global CSS or a layout component later) */}
            <style jsx global>{`
                @media print {
                    body.printing-memo {
                        margin: 0;
                        padding: 0;
                    }
                    body.printing-memo .hide-on-print {
                        display: none;
                    }
                    body.printing-memo #memo-content-area {
                        display: block;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        border: none;
                        box-shadow: none;
                        background-color: transparent;
                    }
                    /* Add any other print-specific overrides here */
                }
            `}</style>
        </div>
    );
} 