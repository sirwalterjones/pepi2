"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "../../../supabase/client";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { Agent, FundRequest } from "@/types/schema"; // Import Agent type AND FundRequest type
import { useToast } from "@/components/ui/use-toast"; // Import useToast

// Import server action
import { requestFundsAction, resubmitFundRequestAction } from "@/app/actions";

interface FundRequestFormProps {
  onSuccess?: () => void;
  initialData?: FundRequest; // Add optional initialData prop
}

export default function FundRequestForm({
  onSuccess,
  initialData,
}: FundRequestFormProps) {
  // Destructure initialData
  const [amount, setAmount] = useState<number | string>("");
  const [caseNumber, setCaseNumber] = useState("");
  const [agentSignature, setAgentSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const { toast } = useToast(); // Initialize toast

  const supabase = createClient();
  const { activeBook } = usePepiBooks();
  const currentDate = new Date().toLocaleDateString();

  // Fetch current agent details
  useEffect(() => {
    const fetchAgent = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: agentData, error: agentError } = await supabase
          .from("agents")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (agentError) {
          console.error("Error fetching agent data:", agentError);
          setError("Could not load your agent details.");
        } else {
          setCurrentAgent(agentData);
        }
      }
    };
    fetchAgent();
  }, [supabase]);

  // Pre-fill form if initialData is provided (for editing)
  useEffect(() => {
    if (initialData) {
      console.log("[FundRequestForm] Editing mode. Initial data:", initialData);
      setAmount(initialData.amount || "");
      setCaseNumber(initialData.case_number || "");
      // Don't pre-fill signature, require re-signing
      setAgentSignature("");
      // Clear any previous errors when opening in edit mode
      setError(null);
    } else {
      // Reset form if opening for a new request (or if initialData becomes undefined)
      setAmount("");
      setCaseNumber("");
      setAgentSignature("");
      setError(null);
    }
  }, [initialData]); // Rerun when initialData changes

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!currentAgent || !activeBook) {
      setError("Agent details or active Pepi Book not loaded. Please refresh.");
      return;
    }

    // Validation
    const numericAmount = parseFloat(amount as string);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    if (!agentSignature.trim()) {
      setError("Please provide your digital signature (type your full name).");
      return;
    }

    setIsSubmitting(true);

    // Add logging here to see what the component thinks it's doing
    console.log(
      `[FundRequestForm handleSubmit] initialData exists: ${!!initialData}`,
    );
    if (initialData) {
      console.log(
        `[FundRequestForm handleSubmit] Attempting to call resubmitFundRequestAction for ID: ${initialData.id}`,
      );
    } else {
      console.log(
        `[FundRequestForm handleSubmit] Attempting to call requestFundsAction`,
      );
    }

    try {
      let result: { success?: boolean; error?: string } | undefined;

      if (initialData) {
        // --- EDIT / RESUBMIT LOGIC ---
        console.log(
          "[FundRequestForm] Resubmitting edited request:",
          initialData.id,
        );

        // Prepare data for the resubmit action
        const resubmitData = {
          requestId: initialData.id,
          amount: numericAmount,
          caseNumber: caseNumber.trim() || null,
          agentSignature: agentSignature.trim(),
        };

        // Call the new server action
        result = await resubmitFundRequestAction(resubmitData);
      } else {
        // --- NEW REQUEST LOGIC (existing) ---
        const formData = {
          amount: numericAmount,
          caseNumber: caseNumber.trim() || null,
          agentSignature: agentSignature.trim(),
          agentId: currentAgent.id,
          pepiBookId: activeBook.id,
        };
        result = await requestFundsAction(formData);
      }

      // Common result handling
      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Success",
        description: initialData
          ? "Fund request updated and resubmitted."
          : "Fund request submitted successfully.",
        variant: "default",
      });

      onSuccess?.(); // Close dialog / trigger callback
    } catch (err: any) {
      console.error("Error submitting/resubmitting fund request:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentAgent) {
    // Optional: Show loading state while agent data is fetched
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto px-2 sm:px-0">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>Request Funds</CardTitle>
        <CardDescription>
          Fill out this form to request funds for operational use from PEPI Book{" "}
          {activeBook?.year || "..."}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input
                value={currentAgent?.name || "Loading..."}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input value={currentDate} disabled readOnly />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Requested ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g., 150.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isSubmitting || !activeBook} // Disable if no active book
            />
            {!activeBook && (
              <p className="text-xs text-destructive">
                No active PEPI Book selected.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="caseNumber">Case # (Optional)</Label>
            <Input
              id="caseNumber"
              type="text"
              placeholder="e.g., 2025-00123"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agentSignature">Agent Digital Signature</Label>
            <Input
              id="agentSignature"
              type="text"
              placeholder="Type your full name to sign"
              value={agentSignature}
              onChange={(e) => setAgentSignature(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              By typing your name, you confirm this request is accurate.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Supervisor Signature</Label>
            <Input value="(Pending Approval)" disabled readOnly />
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6 sticky bottom-0 bg-card border-t">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !activeBook || !currentAgent}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
