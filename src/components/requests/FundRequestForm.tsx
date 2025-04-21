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
import { Agent } from "@/types/schema"; // Import Agent type

// Import server action
import { requestFundsAction } from "@/app/actions";

interface FundRequestFormProps {
  onSuccess?: () => void; // Optional callback for success (e.g., close modal)
}

export default function FundRequestForm({ onSuccess }: FundRequestFormProps) {
  const [amount, setAmount] = useState<number | string>("");
  const [caseNumber, setCaseNumber] = useState("");
  const [agentSignature, setAgentSignature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);

  const supabase = createClient();
  const { activeBook } = usePepiBooks();
  const currentDate = new Date().toLocaleDateString();

  // Fetch current agent details
  useEffect(() => {
    const fetchAgent = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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

    try {
      const formData = {
        amount: numericAmount,
        caseNumber: caseNumber.trim() || null,
        agentSignature: agentSignature.trim(),
        agentId: currentAgent.id,
        pepiBookId: activeBook.id,
      };

      // Call the server action
      const result = await requestFundsAction(formData);

      // Check result for error
      if (result?.error) {
        throw new Error(result.error);
      }

      // Use toast for success notification instead of alert
      // toast({ title: "Success", description: "Fund request submitted successfully." });
      console.log("Fund request submitted successfully!"); // Keep log for now

      // Reset form
      setAmount("");
      setCaseNumber("");
      setAgentSignature("");
      onSuccess?.(); // Call success callback if provided

    } catch (err: any) {
      console.error("Error submitting fund request:", err);
      setError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentAgent) {
    // Optional: Show loading state while agent data is fetched
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>;
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Request Funds</CardTitle>
        <CardDescription>
          Fill out this form to request funds for operational use from PEPI Book {activeBook?.year || '...'}.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input value={currentAgent?.name || 'Loading...'} disabled readOnly />
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
             {!activeBook && <p className="text-xs text-destructive">No active PEPI Book selected.</p>}
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
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting || !activeBook || !currentAgent}>
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