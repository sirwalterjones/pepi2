"use client";

import { useState } from "react";
import { createClient } from "../../../supabase/client";
import { PepiBook } from "@/types/schema";
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
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PepiBookListProps {
  pepiBooks: PepiBook[];
  activeBook: PepiBook | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function PepiBookList({
  pepiBooks,
  activeBook,
  loading,
  onRefresh,
}: PepiBookListProps) {
  const [closingBook, setClosingBook] = useState<PepiBook | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const supabase = createClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleCloseBook = async () => {
    if (!closingBook) return;

    setIsClosing(true);
    try {
      // Get the current balance for this book
      const { data: transactions, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("pepi_book_id", closingBook.id);

      if (fetchError) throw new Error(fetchError.message);

      // Calculate final balance
      let balance = closingBook.starting_amount || 0;
      transactions?.forEach((transaction) => {
        if (transaction.transaction_type === "issuance") {
          balance += parseFloat(transaction.amount);
        } else if (transaction.transaction_type === "return") {
          balance -= parseFloat(transaction.amount);
        } else if (transaction.transaction_type === "spending") {
          balance -= parseFloat(transaction.amount);
        }
      });

      // Update the book as closed with final balance
      const { error: updateError } = await supabase
        .from("pepi_books")
        .update({
          is_active: false,
          is_closed: true,
          closing_balance: balance,
          closed_at: new Date().toISOString(),
        })
        .eq("id", closingBook.id);

      if (updateError) throw new Error(updateError.message);

      toast({
        title: "Success",
        description: `PEPI Book ${closingBook.year} has been closed with a final balance of ${formatCurrency(balance)}.`,
      });

      onRefresh();
    } catch (error) {
      console.error("Error closing PEPI book:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to close PEPI book",
        variant: "destructive",
      });
    } finally {
      setIsClosing(false);
      setClosingBook(null);
    }
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

  if (pepiBooks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No PEPI Books found. Create your first one!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>PEPI Books</CardTitle>
          <CardDescription>Manage your yearly PEPI fund books</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starting Amount</TableHead>
                <TableHead>Current/Final Balance</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pepiBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.year}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {book.is_active ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-green-500">Active</span>
                        </>
                      ) : book.is_closed ? (
                        <>
                          <XCircle className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-500">Closed</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-amber-500">Inactive</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(book.starting_amount || 0)}
                  </TableCell>
                  <TableCell>
                    {book.is_closed && book.closing_balance
                      ? formatCurrency(book.closing_balance)
                      : "--"}
                  </TableCell>
                  <TableCell>
                    {new Date(book.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {book.is_active && !book.is_closed && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setClosingBook(book)}
                      >
                        Close Book
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!closingBook}
        onOpenChange={() => setClosingBook(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close PEPI Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close the PEPI Book for{" "}
              {closingBook?.year}? This action cannot be undone. All
              transactions will be finalized and a closing balance will be
              recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseBook}
              disabled={isClosing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClosing ? "Closing..." : "Close Book"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
