"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, PlusCircle } from "lucide-react";
import CiPaymentForm from "../ci-payments/CiPaymentForm";
import { Agent, PepiBook } from "@/types/schema";
import { toast } from "@/components/ui/use-toast";

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
  currentAgentData,
}: AdminDashboardActionsProps) {
  // Add state for CI Payment Form and email sending
  const [isCiPaymentFormOpen, setIsCiPaymentFormOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Only render buttons if active book exists and user is logged in
  // Changed condition to allow both admins and agents to access
  if (!activeBook?.id || !userId) {
    return null;
  }

  // Function to handle sending test email - now completely disabled
  const handleTestEmail = async () => {
    try {
      setIsSendingEmail(true);
      toast({
        title: "Email sending disabled",
        description: "Automatic emails have been turned off as requested.",
      });

      console.log("[TEST EMAIL] Test email button clicked - emails disabled");

      // No longer calling the API endpoint
      /*
      const response = await fetch("/api/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      */

      // Simulated success response
      setTimeout(() => {
        toast({
          title: "Email sending disabled",
          description: "Automatic emails have been turned off as requested.",
          variant: "success",
        });
      }, 500);

      /*
      const result = await response.json();
      console.log("[TEST EMAIL] API response:", result);

      if (result.success) {
        toast({
          title: "Test email sent successfully",
          description: `Email sent with ID: ${result.data?.id}`,
          variant: "success",
        });
      } else {
        throw new Error(result.error || "Unknown error sending email");
      }
      */
    } catch (error: any) {
      console.error("[TEST EMAIL] Error sending test email:", error);
      toast({
        title: "Error",
        description: `Failed to send test email: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {/* Admin-only buttons */}
      {/* Test email button removed */}
    </div>
  );
}
