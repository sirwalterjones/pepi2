"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { TransactionType, Agent, PepiBook } from "@/types/schema";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { toast } from "../ui/use-toast";
import { useAgents } from "@/hooks/useAgents";
import { usePepiBooks } from "@/hooks/usePepiBooks";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionCreated?: () => void;
}

export default function TransactionForm({
  open,
  onOpenChange,
  onTransactionCreated,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionType>("spending");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("none");
  const [currentUserAgentId, setCurrentUserAgentId] = useState<string | null>(
    null,
  );

  const { agents, loading: agentsLoading } = useAgents();
  const { activeBook, loading: pepiBookLoading } = usePepiBooks();
  const supabase = createClient();

  const resetForm = () => {
    setTransactionType("issuance");
    setAmount("");
    setReceiptNumber("");
    setDescription("");

    // If user is not admin, keep their agent ID selected
    // Otherwise, reset to none
    if (!isAdmin && currentUserAgentId) {
      setSelectedAgentId(currentUserAgentId);
    } else {
      setSelectedAgentId("none");
    }
  };

  // Generate a receipt number for all transaction types
  const generateReceiptNumber = () => {
    let prefix;
    switch (transactionType) {
      case "issuance":
        prefix = "ISS";
        break;
      case "return":
        prefix = "RET";
        break;
      case "spending":
        prefix = "SPD";
        break;
      default:
        prefix = "TRX";
    }
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate amount
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid positive amount",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to create a transaction",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Generate receipt number for all transaction types if not provided
      const finalReceiptNumber = receiptNumber || generateReceiptNumber();

      // Get user role to determine transaction status
      const { data: userData, error: userError } = await supabase
        .from("agents")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userError) {
        console.error("Error fetching user role:", userError);
        toast({
          title: "Error",
          description: `Failed to verify user role: ${userError.message}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if we found a role for this user
      const isAdmin = userData?.role === "admin";

      // Create transaction
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          transaction_type: transactionType,
          amount: amountValue,
          receipt_number: finalReceiptNumber,
          description: description || null,
          agent_id: selectedAgentId === "none" ? null : selectedAgentId,
          pepi_book_id: activeBook?.id || null,
          created_by: user.id,
          status: isAdmin ? "approved" : "pending", // Admins auto-approve, agents submit as pending
          review_notes: null,
        })
        .select();

      // Note: We don't update the PEPI book balance here as it's calculated dynamically
      // in the DashboardOverview component based on all approved transactions

      if (error) {
        console.error("Error creating transaction:", error);
        toast({
          title: "Error",
          description: `Failed to create transaction: ${error.message}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: isAdmin
          ? "Transaction created successfully"
          : "Transaction submitted for review",
      });

      // Reset form and close dialog
      resetForm();
      onOpenChange(false);

      // Notify parent component that a transaction was created
      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Find the selected agent's name for display
  const getSelectedAgentName = () => {
    if (!selectedAgentId || selectedAgentId === "none") return "";
    const agent = agents?.find((agent) => agent.id === selectedAgentId);
    return agent
      ? `${agent.name}${agent.badge_number ? ` (${agent.badge_number})` : ""}`
      : "";
  };

  // Check if user is admin and get current user's agent ID
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from("agents")
            .select("role, id")
            .eq("user_id", user.id)
            .maybeSingle();

          setIsAdmin(userData?.role === "admin");

          // Set the current user's agent ID
          if (userData?.id) {
            setCurrentUserAgentId(userData.id);
            // If user is not admin, automatically set their agent ID
            if (userData.role !== "admin") {
              setSelectedAgentId(userData.id);
            }
          }

          // If user is not admin, force transaction type to spending
          if (userData?.role !== "admin") {
            setTransactionType("spending");
          }
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, [supabase]);

  // Auto-generate receipt number when transaction type changes
  useEffect(() => {
    if (!receiptNumber) {
      setReceiptNumber(generateReceiptNumber());
    }
  }, [transactionType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details for the new transaction.
            {activeBook ? (
              <span className="block mt-2 text-sm font-medium text-primary">
                This transaction will be associated with the active PEPI Book
                for {activeBook.year}.
              </span>
            ) : (
              <span className="block mt-2 text-sm font-medium text-amber-500">
                Warning: No active PEPI Book found. This transaction will not be
                associated with any PEPI Book.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transaction-type" className="text-right">
                Type
              </Label>
              <Select
                value={transactionType}
                onValueChange={(value) =>
                  setTransactionType(value as TransactionType)
                }
                disabled={!isAdmin}
              >
                <SelectTrigger id="transaction-type" className="col-span-3">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin ? (
                    <>
                      <SelectItem value="issuance">Issuance</SelectItem>
                      <SelectItem value="spending">Spending</SelectItem>
                      <SelectItem value="return">Return</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="spending">Spending</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount ($)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receipt-number" className="text-right">
                Receipt #
              </Label>
              <Input
                id="receipt-number"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Optional receipt number"
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agent" className="text-right">
                Agent
              </Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={
                  agentsLoading || (!isAdmin && currentUserAgentId !== null)
                }
              >
                <SelectTrigger id="agent" className="col-span-3">
                  <SelectValue placeholder="Select an agent">
                    {getSelectedAgentName()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="none">None</SelectItem>}
                  {agents && agents.length > 0 ? (
                    agents.map((agent) => (
                      <SelectItem
                        key={agent.id}
                        value={agent.id}
                        disabled={!isAdmin && agent.id !== currentUserAgentId}
                      >
                        {agent.name}{" "}
                        {agent.badge_number ? `(${agent.badge_number})` : ""}
                        {agent.id === currentUserAgentId && !isAdmin
                          ? " (You)"
                          : ""}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No agents available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter transaction details"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                  Creating...
                </>
              ) : (
                "Create Transaction"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
