"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PepiBookAddFundsFormProps {
  bookId: string;
  onSubmit: (data: { amount: number; description: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function PepiBookAddFundsForm({
  bookId,
  onSubmit,
  isSubmitting = false,
}: PepiBookAddFundsFormProps) {
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (amount <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    if (!description.trim()) {
      setError("Please provide a description for this transaction");
      return;
    }

    try {
      await onSubmit({ amount, description });
      // Reset form after successful submission
      setAmount(0);
      setDescription("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while adding funds to the PEPI Book",
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Funds to PEPI Book</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Additional funding for operations"
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding Funds..." : "Add Funds"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
