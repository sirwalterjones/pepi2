"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import CiPaymentForm from "../ci-payments/CiPaymentForm";
import { Agent, PepiBook } from "@/types/schema";

type AdminDashboardActionsProps = {
    userId: string | null;
    isAdmin: boolean;
    activeBook: PepiBook | null;
    currentAgentData: Agent | null;
};

export default function AdminDashboardActions({
    userId,
    isAdmin,
    activeBook,
    currentAgentData
}: AdminDashboardActionsProps) {
    const [isCiPaymentFormOpen, setIsCiPaymentFormOpen] = useState(false);

    // Only render buttons if admin and active book exists
    if (!isAdmin || !activeBook?.id || !userId) {
        return null; 
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            {/* Placeholder for potential future admin buttons */}
            {/* <Button>Some Admin Action</Button> */}
            
            {/* New CI Payment Button (Admin Only) */}
            <Dialog open={isCiPaymentFormOpen} onOpenChange={setIsCiPaymentFormOpen}>
                <DialogTrigger asChild>
                    <Button variant="secondary">
                        <PlusCircle className="mr-2 h-4 w-4" /> New CI Payment
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl"> 
                    <DialogHeader>
                        <DialogTitle>New CI Payment (Admin)</DialogTitle>
                        <DialogDescription>
                            Fill out the form to record a Confidential Informant payment. It will be submitted for approval.
                        </DialogDescription>
                    </DialogHeader>
                    {/* Ensure userId exists before rendering */}
                    {userId && activeBook && ( 
                         <CiPaymentForm
                            userId={userId} 
                            userRole={'admin'}
                            activeBookId={activeBook.id}
                            agentData={currentAgentData} 
                            onFormSubmitSuccess={() => {
                                setIsCiPaymentFormOpen(false);
                                // Note: Re-fetching data is handled by real-time subs or parent component
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
} 