"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { TransactionType, TransactionStatus } from "@/types/schema";
import { Badge } from "../ui/badge";
import {
  Printer,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Edit,
  Save,
} from "lucide-react";
import { useToast } from "../ui/use-toast";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useAgents } from "@/hooks/useAgents";

interface TransactionDetailsProps {
  transaction: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function TransactionDetails({
  transaction,
  open,
  onOpenChange,
  onDelete,
  onEdit,
}: TransactionDetailsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [status, setStatus] = useState<TransactionStatus>("pending");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwnTransaction, setIsOwnTransaction] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<any>(null);
  const [creatorName, setCreatorName] = useState<string>("");
  const { agents } = useAgents();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (transaction) {
      setReviewNotes(transaction.review_notes || "");
      setStatus(transaction.status || "pending");
      setEditedTransaction({
        ...transaction,
        amount: parseFloat(transaction.amount),
        description: transaction.description || "",
        receipt_number: transaction.receipt_number || "",
        agent_id: transaction.agent_id || null,
      });

      // Check if current user is an admin and if this is their transaction
      const checkUserRole = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("agents")
            .select("id, role")
            .eq("user_id", user.id)
            .single();

          setIsAdmin(data?.role === "admin");

          // Check if this transaction belongs to the current agent
          if (data && transaction.agent_id === data.id) {
            setIsOwnTransaction(true);
          }
        }
      };

      // Fetch the creator's name
      const fetchCreatorName = async () => {
        if (transaction.created_by) {
          const { data } = await supabase
            .from("agents")
            .select("name")
            .eq("user_id", transaction.created_by)
            .single();

          if (data?.name) {
            setCreatorName(data.name);
          } else {
            // If no agent found with that user_id, try to get the email from auth.users
            const { data: userData, error } =
              await supabase.auth.admin.getUserById(transaction.created_by);

            if (!error && userData?.user) {
              setCreatorName(userData.user.email || "Unknown User");
            } else {
              setCreatorName("Unknown User");
            }
          }
        }
      };

      checkUserRole();
      fetchCreatorName();
    }
  }, [transaction, supabase]);

  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return "Fund Issuance";
      case "spending":
        return "Fund Expenditure";
      case "return":
        return "Fund Return";
      default:
        return "Transaction";
    }
  };

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return <Badge variant="destructive">Issued</Badge>;
      case "spending":
        return <Badge variant="outline">Spent</Badge>;
      case "return":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
          >
            Returned
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          >
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  const handleUpdateStatus = async () => {
    if (!transaction) return;

    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .update({
          status: status,
          review_notes: reviewNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .select();

      if (error) throw error;

      toast({
        title: "Transaction updated",
        description: `The transaction has been ${status}.`,
      });

      // Update local transaction data
      if (data && data.length > 0) {
        Object.assign(transaction, data[0]);
      }

      // Always call both callbacks to ensure both the modal and the list are updated
      if (onEdit) onEdit();
      if (onDelete) onDelete(); // Refresh the transaction list
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editedTransaction) return;

    setIsUpdating(true);
    try {
      // If an agent is editing a rejected transaction, reset the status to pending
      const updateData: any = {
        amount:
          typeof editedTransaction.amount === "string"
            ? parseFloat(editedTransaction.amount)
            : editedTransaction.amount,
        description: editedTransaction.description || null,
        receipt_number: editedTransaction.receipt_number || null,
        agent_id: editedTransaction.agent_id || null,
        updated_at: new Date().toISOString(),
      };

      console.log("Saving transaction with data:", updateData);
      console.log("Original amount type:", typeof editedTransaction.amount);
      console.log("Parsed amount type:", typeof updateData.amount);

      // If this is an agent editing their rejected transaction, reset to pending
      if (isOwnTransaction && transaction.status === "rejected" && !isAdmin) {
        updateData.status = "pending";
        // Clear review notes when resubmitting
        updateData.review_notes = null;
      }

      // Ensure amount is a valid number
      if (isNaN(updateData.amount)) {
        throw new Error("Invalid amount value");
      }

      // Convert amount to string for Supabase (it expects string for numeric fields)
      const amountAsString = updateData.amount.toString();

      // Log the amount to make sure it's correct
      console.log("Amount being saved:", amountAsString, typeof amountAsString);

      // Log the final data being sent to the database
      console.log(
        "Final update data being sent to database:",
        JSON.stringify({ ...updateData, amount: amountAsString }),
      );

      // Try a direct update with the regular update method instead of RPC
      const { data, error } = await supabase
        .from("transactions")
        .update({
          amount: amountAsString, // Send as string for Supabase numeric fields
          description: updateData.description,
          receipt_number: updateData.receipt_number,
          agent_id: updateData.agent_id,
          updated_at: updateData.updated_at,
          // If this is an agent editing their rejected transaction, reset to pending
          ...(isOwnTransaction && transaction.status === "rejected" && !isAdmin
            ? { status: "pending", review_notes: null }
            : {}),
        })
        .eq("id", transaction.id)
        .select();

      console.log("Update response:", { data, error });

      if (error) throw error;

      const successMessage =
        isOwnTransaction && transaction.status === "rejected" && !isAdmin
          ? "Transaction has been updated and resubmitted for approval"
          : "The transaction has been successfully updated.";

      toast({
        title: "Transaction edited",
        description: successMessage,
      });

      // Fetch the updated transaction directly to ensure we have the latest data
      const { data: updatedData, error: fetchError } = await supabase
        .from("transactions")
        .select("*, agents:agent_id (id, name, badge_number)")
        .eq("id", transaction.id)
        .single();

      if (fetchError) {
        console.error("Error fetching updated transaction:", fetchError);
        throw fetchError;
      }

      // Update with the freshly fetched data
      if (updatedData) {
        console.log(
          "Freshly fetched transaction data:",
          JSON.stringify(updatedData),
        );

        // Create a completely new transaction object with the updated data
        const updatedTransaction = {
          ...updatedData,
          amount: parseFloat(updatedData.amount),
          description: updatedData.description || "",
          receipt_number: updatedData.receipt_number || "",
          agent_id: updatedData.agent_id || null,
        };

        // Replace the entire transaction object
        Object.keys(transaction).forEach((key) => {
          transaction[key] = updatedTransaction[key] || transaction[key];
        });

        // Also update all related state variables
        setReviewNotes(updatedData.review_notes || "");
        setStatus(updatedData.status || "pending");

        // Force UI to update with the new transaction data
        setEditedTransaction(updatedTransaction);

        // Force selected transaction to update in parent component
        if (onEdit) {
          // Pass the updated transaction to the parent
          onEdit();
        }
      }

      setIsEditing(false);
      // Always call both callbacks to ensure both the modal and the list are updated
      if (onEdit) onEdit();
      if (onDelete) onDelete(); // Refresh the transaction list
    } catch (error: any) {
      console.error("Error editing transaction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to edit transaction",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!transaction.receipt_number) {
      toast({
        title: "No receipt available",
        description: "This transaction doesn't have a receipt number.",
        variant: "destructive",
      });
      return;
    }

    // In a real app, this would use a proper print library
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${transaction.receipt_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ccc; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: bold; }
              .info { margin: 15px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
              .label { font-weight: bold; }
              .amount { font-size: 20px; font-weight: bold; margin: 15px 0; text-align: center; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <div class="title">PEPI Money Tracker</div>
                <div>Official Receipt</div>
              </div>
              
              <div class="info">
                <div class="info-row">
                  <span class="label">Receipt #:</span>
                  <span>${transaction.receipt_number}</span>
                </div>
                <div class="info-row">
                  <span class="label">Date:</span>
                  <span>${formatDate(transaction.created_at)}</span>
                </div>
                <div class="info-row">
                  <span class="label">Transaction Type:</span>
                  <span>${transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}</span>
                </div>
                ${
                  transaction.agent
                    ? `
                <div class="info-row">
                  <span class="label">Agent:</span>
                  <span>${transaction.agent.name} ${transaction.agent.badge_number ? `(${transaction.agent.badge_number})` : ""}</span>
                </div>`
                    : ""
                }
                ${
                  creatorName
                    ? `
                <div class="info-row">
                  <span class="label">Created/Approved By:</span>
                  <span>${creatorName}</span>
                </div>`
                    : ""
                }
                ${
                  transaction.description
                    ? `
                <div class="info-row">
                  <span class="label">Description:</span>
                  <span>${transaction.description}</span>
                </div>`
                    : ""
                }
              </div>
              
              <div class="amount">
                ${formatCurrency(transaction.amount)}
              </div>
              
              <div class="footer">
                <p>Thank you for using PEPI Money Tracker</p>
                <p>This is an official receipt for task force financial records.</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    try {
      console.log(`[Client] Attempting to delete transaction ID: ${transaction.id}`);
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      // Log the error object regardless
      console.log(`[Client] Supabase delete result error:`, error);

      if (error) throw error;

      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      });

      onOpenChange(false);
      if (onDelete) onDelete();
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Create a local copy of the transaction for rendering to ensure we're using the latest data
  const displayTransaction = editedTransaction || transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTransactionTypeLabel(displayTransaction.transaction_type)}
            {getTransactionBadge(displayTransaction.transaction_type)}
          </DialogTitle>
          <DialogDescription>
            Transaction ID: {displayTransaction.id.substring(0, 8)}...
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center bg-muted p-4 rounded-md">
            <div className="text-sm text-muted-foreground">Amount</div>
            {isEditing ? (
              <div className="mt-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={
                    typeof editedTransaction.amount === "number"
                      ? editedTransaction.amount.toString()
                      : editedTransaction.amount || ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsedValue = value ? parseFloat(value) : 0;
                    setEditedTransaction({
                      ...editedTransaction,
                      amount: parsedValue,
                    });
                  }}
                  className="text-center text-xl font-bold"
                />
              </div>
            ) : (
              <div className="text-3xl font-bold">
                {formatCurrency(displayTransaction.amount)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Date</div>
              <div>{formatDate(displayTransaction.created_at)}</div>
            </div>

            <div>
              <div className="text-sm font-medium">Receipt Number</div>
              {isEditing ? (
                <Input
                  value={editedTransaction.receipt_number}
                  onChange={(e) =>
                    setEditedTransaction({
                      ...editedTransaction,
                      receipt_number: e.target.value,
                    })
                  }
                  placeholder="Enter receipt number"
                />
              ) : (
                <div>{displayTransaction.receipt_number || "N/A"}</div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium">Agent</div>
              {isEditing ? (
                <Select
                  value={editedTransaction.agent_id || "none"}
                  onValueChange={(value) =>
                    setEditedTransaction({
                      ...editedTransaction,
                      agent_id: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}{" "}
                        {agent.badge_number ? `(${agent.badge_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div>
                  {displayTransaction.agent ? (
                    <>
                      {displayTransaction.agent.name}{" "}
                      {displayTransaction.agent.badge_number
                        ? `(${displayTransaction.agent.badge_number})`
                        : ""}
                    </>
                  ) : (
                    "None"
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium">Created By</div>
              <div>{creatorName || "System"}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">Description</div>
            {isEditing ? (
              <Textarea
                value={editedTransaction.description}
                onChange={(e) =>
                  setEditedTransaction({
                    ...editedTransaction,
                    description: e.target.value,
                  })
                }
                placeholder="Enter transaction description"
                className="mt-1"
              />
            ) : (
              <div className="bg-muted/50 p-3 rounded-md mt-1">
                {displayTransaction.description || "No description provided"}
              </div>
            )}
          </div>

          {displayTransaction.status && (
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="mt-1 flex items-center gap-2">
                {getStatusBadge(displayTransaction.status)}
              </div>
            </div>
          )}

          {displayTransaction.review_notes && (
            <div>
              <div className="text-sm font-medium">Review Notes</div>
              <div className="bg-muted/50 p-3 rounded-md mt-1">
                {displayTransaction.review_notes}
              </div>
              {displayTransaction.status === "rejected" &&
                isOwnTransaction &&
                !isEditing && (
                  <div className="mt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Transaction Based on Feedback
                    </Button>
                  </div>
                )}
            </div>
          )}

          {isAdmin && displayTransaction.status === "pending" && (
            <div className="border-t pt-4 mt-4">
              <div className="text-sm font-medium mb-2">Review Transaction</div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Update Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value as TransactionStatus)
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review Notes</Label>
                  <Textarea
                    id="review-notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes about this transaction"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={isUpdating}
                    className={
                      status === "approved"
                        ? "bg-green-600 hover:bg-green-700"
                        : status === "rejected"
                          ? "bg-red-600 hover:bg-red-700"
                          : ""
                    }
                  >
                    {isUpdating ? (
                      "Updating..."
                    ) : status === "approved" ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Transaction
                      </>
                    ) : status === "rejected" ? (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Transaction
                      </>
                    ) : (
                      "Update Status"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}

            {displayTransaction.receipt_number && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintReceipt}
                className="flex-1"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            )}

            {isAdmin && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex-1"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Transaction
              </Button>
            )}

            {isEditing && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? (
                  "Saving..."
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>

          {!isEditing && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteTransaction}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Transaction"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
