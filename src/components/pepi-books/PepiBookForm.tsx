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

interface PepiBookFormProps {
  onSubmit: (data: { year: number; startingAmount: number }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function PepiBookForm({
  onSubmit,
  isSubmitting = false,
}: PepiBookFormProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [startingAmount, setStartingAmount] = useState<number>(0);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!year || year < 2000 || year > 2100) {
      setError("Please enter a valid year between 2000 and 2100");
      return;
    }

    if (startingAmount <= 0) {
      setError("Starting amount must be greater than zero");
      return;
    }

    try {
      await onSubmit({ year, startingAmount });
      // Reset form after successful submission
      setYear(new Date().getFullYear());
      setStartingAmount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while creating the PEPI Book",
      );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New PEPI Book</CardTitle>
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
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startingAmount">Starting Amount ($)</Label>
            <Input
              id="startingAmount"
              type="number"
              min="0.01"
              step="0.01"
              value={startingAmount}
              onChange={(e) => setStartingAmount(parseFloat(e.target.value))}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create PEPI Book"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
