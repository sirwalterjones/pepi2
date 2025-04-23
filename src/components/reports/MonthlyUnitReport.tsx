'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePepiBooks } from '@/hooks/usePepiBooks';
import { getMonthlyUnitReportAction, MonthlyUnitReportTransaction } from '@/app/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { DataTable } from "@/components/ui/data-table"; // Assuming DataTable exists
import { type ColumnDef, type Row } from "@tanstack/react-table";
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from "@/components/ui/badge";

export default function MonthlyUnitReport() {
    const { activeBook } = usePepiBooks();
    const { toast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [reportData, setReportData] = useState<MonthlyUnitReportTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableMonths, setAvailableMonths] = useState<{ value: number; label: string }[]>([]);

    // Populate available months based on active book
    useEffect(() => {
        if (activeBook) {
            const months = [];
            const year = activeBook.year;
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            for (let i = 1; i <= 12; i++) {
                if (year < currentYear || (year === currentYear && i <= currentMonth)) {
                    const monthDate = new Date(Date.UTC(year, i - 1, 1));
                    const monthLabel = monthDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
                    months.push({ value: i, label: `${monthLabel} ${year}` });
                }
            }
            setAvailableMonths(months);
            setSelectedMonth(null); // Reset selection when book changes
            setReportData([]);
            setError(null);
        } else {
            setAvailableMonths([]);
            setSelectedMonth(null);
            setReportData([]);
            setError(null);
        }
    }, [activeBook]);

    const handleFetchReport = async () => {
        if (!activeBook || selectedMonth === null) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a month.' });
            return;
        }

        setLoading(true);
        setError(null);
        setReportData([]);

        try {
            const result = await getMonthlyUnitReportAction(activeBook.id, selectedMonth);
            if (result.success && result.data) {
                setReportData(result.data);
            } else {
                setError(result.error || 'Failed to fetch report data.');
                toast({ variant: 'destructive', title: 'Error Fetching Report', description: result.error });
            }
        } catch (err: any) {
            setError('An unexpected error occurred.');
            toast({ variant: 'destructive', title: 'Unexpected Error', description: err.message });
        } finally {
            setLoading(false);
        }
    };

    // Define columns for the DataTable with explicit row type
    const columns = useMemo<ColumnDef<MonthlyUnitReportTransaction>[]>(() => [
        {
            accessorKey: "created_at",
            header: "Date",
            cell: ({ row }: { row: Row<MonthlyUnitReportTransaction> }) => format(new Date(row.getValue("created_at")), "Pp"),
        },
        {
            accessorKey: "transaction_type",
            header: "Type",
             cell: ({ row }: { row: Row<MonthlyUnitReportTransaction> }) => {
                const type = row.getValue("transaction_type") as string;
                // Basic badge styling, can be customized
                let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
                if (type === 'issuance') variant = 'default';
                if (type === 'spending') variant = 'destructive';
                if (type === 'agent_return') variant = 'secondary';
                return <Badge variant={variant} className="capitalize">{type.replace('_', ' ')}</Badge>;
            },
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }: { row: Row<MonthlyUnitReportTransaction> }) => formatCurrency(row.getValue("amount")),
        },
        {
            accessorKey: "description",
            header: "Description",
        },
        {
            accessorKey: "agent_name",
            header: "Agent",
            cell: ({ row }: { row: Row<MonthlyUnitReportTransaction> }) => row.getValue("agent_name") || 'N/A',
        },
         {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }: { row: Row<MonthlyUnitReportTransaction> }) => <Badge variant={row.getValue("status") === 'approved' ? 'default' : 'secondary'} className="capitalize">{row.getValue("status")}</Badge>,
        },
         {
            accessorKey: "receipt_number",
            header: "Receipt #",
        },
    ], []);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-full sm:w-auto sm:min-w-[200px]">
                    <Select 
                        value={selectedMonth !== null ? String(selectedMonth) : ''} 
                        onValueChange={(value) => setSelectedMonth(value ? Number(value) : null)}
                    >
                        <SelectTrigger id="month-select-unit">
                            <SelectValue placeholder="Select month..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => (
                                <SelectItem key={month.value} value={String(month.value)}>
                                    {month.label}
                                </SelectItem>
                            ))}
                             {availableMonths.length === 0 && <p className="p-4 text-sm text-muted-foreground">Select active book first.</p>}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleFetchReport} disabled={loading || !selectedMonth}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Generate Report
                </Button>
            </div>

            {error && (
                <p className="text-red-600">Error: {error}</p>
            )}

            {!loading && !error && reportData.length === 0 && selectedMonth !== null && (
                 <p className="text-muted-foreground">No transactions found for the selected month.</p>
            )}

            {reportData.length > 0 && (
                <DataTable columns={columns} data={reportData} />
            )}
        </div>
    );
} 