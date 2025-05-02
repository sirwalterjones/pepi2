"use client";

import { useToast } from "@/components/ui/use-toast";
import { useEffect } from "react";

interface TransactionApprovalHandlerProps {
  emailStatus?: {
    success: boolean;
    toastMessage: string;
  };
}

export default function TransactionApprovalHandler({
  emailStatus,
}: TransactionApprovalHandlerProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (emailStatus?.toastMessage) {
      toast({
        title: emailStatus.success
          ? "Email Notification Sent"
          : "Email Notification Issue",
        description: emailStatus.toastMessage,
        variant: emailStatus.success ? "default" : "destructive",
      });
    }
  }, [emailStatus, toast]);

  return null; // This is a utility component that doesn't render anything
}
