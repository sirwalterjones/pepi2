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

  // Function to handle sending test email - disabled automatic calls
  const handleTestEmail = async () => {
    try {
      setIsSendingEmail(true);
      toast({
        title: "Sending test email",
        description: "Attempting to send a test email notification...",
      });

      console.log("[TEST EMAIL] Sending test email via button click");

      // Call the API endpoint to send the email
      const response = await fetch("/api/send-test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

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
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Admin-only buttons */}
      {isAdmin && (
        <Button
          onClick={handleTestEmail}
          disabled={isSendingEmail}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-sm"
          size="lg"
        >
          {isSendingEmail ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-5 w-5" />
              Send Test Email
            </>
          )}
        </Button>
      )}
    </div>
  );
}
