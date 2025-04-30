"use client";

import { useState } from "react";
import { Transaction } from "@/types/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign } from "lucide-react";

interface PepiBookFundAdditionsProps {
  fundAdditions: Transaction[];
  loading: boolean;
}

export default function PepiBookFundAdditions({
  fundAdditions,
  loading,
}: PepiBookFundAdditionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fundAdditions || fundAdditions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-600" />
            Fund Additions
          </CardTitle>
          <CardDescription>
            History of funds added to this PEPI book
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              No fund additions found for this PEPI book.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="mr-2 h-5 w-5 text-green-600" />
          Fund Additions
        </CardTitle>
        <CardDescription>
          History of funds added to this PEPI book
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Receipt Number</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundAdditions.map((addition) => (
              <TableRow key={addition.id}>
                <TableCell>{formatDate(addition.created_at)}</TableCell>
                <TableCell>{addition.receipt_number || "N/A"}</TableCell>
                <TableCell>{addition.description || "Fund Addition"}</TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {formatCurrency(addition.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
