"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PrintReceiptButton() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
        </Button>
    );
} 