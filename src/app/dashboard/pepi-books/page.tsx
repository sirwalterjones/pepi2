"use client";

import { useState } from "react";
import { createClient } from "../../../../supabase/client";
import { PepiBook } from "@/types/schema";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import PepiBookForm from "@/components/pepi-books/PepiBookForm";
import PepiBookList from "@/components/pepi-books/PepiBookList";
import PepiBookAddFundsForm from "@/components/pepi-books/PepiBookAddFundsForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { PlusCircle, DollarSign } from "lucide-react";
import { addPepiBookFundsAction } from "@/app/actions";

export default function PepiBooksPage() {
  const { pepiBooks, activeBook, loading, error, refresh } = usePepiBooks();
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false);
  const supabase = createClient();

  const handleCreatePepiBook = async (data: {
    year: number;
    startingAmount: number;
  }) => {
    setIsCreating(true);
    try {
      // Check if a book for this year already exists
      const { data: existingBooks, error: checkError } = await supabase
        .from("pepi_books")
        .select("*")
        .eq("year", data.year);

      if (checkError) throw new Error(checkError.message);

      if (existingBooks && existingBooks.length > 0) {
        throw new Error(`A PEPI Book for ${data.year} already exists`);
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to create a PEPI Book");
      }

      // Check if there's already an active book
      const { data: activeBooks, error: activeError } = await supabase
        .from("pepi_books")
        .select("*")
        .eq("is_active", true);

      if (activeError) throw new Error(activeError.message);

      // Create the new PEPI Book
      const { data: newBook, error: createError } = await supabase
        .from("pepi_books")
        .insert({
          year: data.year,
          starting_amount: data.startingAmount,
          is_active: activeBooks && activeBooks.length === 0, // Only set as active if no other active books
          created_by: user.id,
        })
        .select();

      if (createError) throw new Error(createError.message);

      // If this is the first book, create an initial transaction for the starting amount
      if (newBook && newBook.length > 0) {
        const book = newBook[0] as PepiBook;

        // Only create a transaction if this book is active
        if (book.is_active) {
          const { error: transactionError } = await supabase
            .from("transactions")
            .insert({
              transaction_type: "issuance",
              amount: data.startingAmount,
              description: `Initial funding for ${data.year} PEPI Book`,
              pepi_book_id: book.id,
              created_by: user.id,
              receipt_number: `INIT-${data.year}-${Math.floor(
                Math.random() * 1000,
              )
                .toString()
                .padStart(3, "0")}`,
            });

          if (transactionError) {
            console.error(
              "Error creating initial transaction:",
              transactionError,
            );
          }
        }
      }

      toast({
        title: "Success",
        description: `PEPI Book for ${data.year} created successfully${activeBooks && activeBooks.length > 0 ? ", but it is not active because another book is currently active" : " and set as active"}`,
      });

      setDialogOpen(false);
      refresh();
    } catch (error) {
      console.error("Error creating PEPI book:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create PEPI book",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddFunds = async (data: {
    amount: number;
    description: string;
  }) => {
    if (!activeBook) {
      toast({
        title: "Error",
        description: "No active PEPI Book found",
        variant: "destructive",
      });
      return;
    }

    setIsAddingFunds(true);
    try {
      const formData = new FormData();
      formData.append("bookId", activeBook.id);
      formData.append("amount", data.amount.toString());
      formData.append("description", data.description);

      const result = await addPepiBookFundsAction(formData);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        setAddFundsDialogOpen(false);
        refresh();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding funds:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add funds",
        variant: "destructive",
      });
    } finally {
      setIsAddingFunds(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">PEPI Books</h1>
        <div className="flex gap-2">
          {activeBook && (
            <Dialog
              open={addFundsDialogOpen}
              onOpenChange={setAddFundsDialogOpen}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Funds to PEPI Book</DialogTitle>
                  <DialogDescription>
                    Add additional funds to the active PEPI Book (
                    {activeBook.year}).
                  </DialogDescription>
                </DialogHeader>
                <PepiBookAddFundsForm
                  bookId={activeBook.id}
                  onSubmit={handleAddFunds}
                  isSubmitting={isAddingFunds}
                />
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New PEPI Book
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New PEPI Book</DialogTitle>
                <DialogDescription>
                  Enter the year and starting amount for the new PEPI Book.
                </DialogDescription>
              </DialogHeader>
              <PepiBookForm
                onSubmit={handleCreatePepiBook}
                isSubmitting={isCreating}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {activeBook && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active PEPI Book</CardTitle>
            <CardDescription>
              All new transactions will be associated with this book
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Year
                </p>
                <p className="text-2xl font-bold">{activeBook.year}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Starting Amount
                </p>
                <p className="text-2xl font-bold">
                  ${activeBook.starting_amount?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Additional Funds
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${activeBook.additionalFunds?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Current Balance
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  ${activeBook.currentBalance?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <PepiBookList
        pepiBooks={pepiBooks}
        activeBook={activeBook}
        loading={loading}
        onRefresh={refresh}
      />

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
