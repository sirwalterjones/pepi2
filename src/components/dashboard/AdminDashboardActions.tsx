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
  currentAgentData,
}: AdminDashboardActionsProps) {
  // Add state for CI Payment Form
  const [isCiPaymentFormOpen, setIsCiPaymentFormOpen] = useState(false);

  // Only render buttons if active book exists and user is logged in
  // Changed condition to allow both admins and agents to access
  if (!activeBook?.id || !userId) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Placeholder for potential future admin-only buttons */}
      {/* {isAdmin && <Button>Admin-Only Action</Button>} */}
    </div>
  );
}
