"use client";

import { useState, useEffect, useRef } from "react";
import { useTransactionEditHandler } from "./TransactionEditHandler";
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
  CalendarIcon,
  Paperclip,
  X,
  FileText,
  Download,
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
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { agents } = useAgents();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    if (transaction) {
      console.log("Transaction data loaded in component:", transaction);
      console.log("Transaction ID:", transaction.id);

      // Reset state variables with transaction data
      setReviewNotes(transaction.review_notes || "");
      setStatus(transaction.status || "pending");

      // Create a fresh copy of the transaction for editing
      const freshTransactionCopy = {
        ...transaction,
        amount: parseFloat(transaction.amount),
        description: transaction.description || "",
        receipt_number: transaction.receipt_number || "",
        agent_id: transaction.agent_id || null,
        status: transaction.status || "pending",
        review_notes: transaction.review_notes || "",
      };

      console.log(
        "Setting editedTransaction state with:",
        freshTransactionCopy,
      );
      setEditedTransaction(freshTransactionCopy);

      // Check if current user is an admin and if this is their transaction
      const checkUserRole = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          console.log("Current user ID:", user.id);
          const { data } = await supabase
            .from("agents")
            .select("id, role")
            .eq("user_id", user.id)
            .single();

          const isUserAdmin = data?.role === "admin";
          console.log("User is admin:", isUserAdmin);
          setIsAdmin(isUserAdmin);

          // Check if this transaction belongs to the current agent
          if (data && transaction.agent_id === data.id) {
            console.log("This is user's own transaction");
            setIsOwnTransaction(true);
          } else {
            console.log("This is NOT user's own transaction");
            setIsOwnTransaction(false);
          }
        }
      };

      // Fetch the creator's name
      const fetchCreatorName = async () => {
        if (transaction.created_by) {
          console.log(
            "Fetching creator name for user ID:",
            transaction.created_by,
          );
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
    if (!dateString) return "N/A";
    // Parse the date string directly without timezone conversion
    if (dateString.includes("T")) {
      const [year, month, day] = dateString
        .split("T")[0]
        .split("-")
        .map(Number);
      // Month is 0-indexed in JavaScript Date
      return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else {
      // Handle date-only strings
      const [year, month, day] = dateString.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
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

      const successMessage = !isAdmin
        ? "Transaction has been updated and resubmitted for approval"
        : "The transaction has been successfully updated.";

      toast({
        title: "Transaction edited",
        description: successMessage,
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

  // Import the transaction edit handler
  const { updateTransaction, isUpdating: isEditUpdating } =
    useTransactionEditHandler();

  const handleSaveEdit = async () => {
    if (!editedTransaction || !transaction?.id) return;

    setIsUpdating(true);
    try {
      console.log("Starting transaction edit with ID:", transaction.id);

      // --- Validation for Spending Specific Fields (when editing) ---
      if (editedTransaction.transaction_type === "spending") {
        if (!editedTransaction.spending_category) {
          toast({
            title: "Missing Category",
            description: "Please select a spending category.",
            variant: "destructive",
          });
          setIsUpdating(false);
          return;
        }
        if (editedTransaction.spending_category === "Evidence Purchase") {
          if (!editedTransaction.case_number?.trim()) {
            toast({
              title: "Missing Case #",
              description: "Case # is required for Evidence Purchases.",
              variant: "destructive",
            });
            setIsUpdating(false);
            return;
          }
          if (!editedTransaction.ecr_number?.trim()) {
            toast({
              title: "Missing ECR #",
              description: "ECR # is required for Evidence Purchases.",
              variant: "destructive",
            });
            setIsUpdating(false);
            return;
          }
          if (!editedTransaction.date_to_evidence) {
            toast({
              title: "Missing Date",
              description:
                "Date to Evidence is required for Evidence Purchases.",
              variant: "destructive",
            });
            setIsUpdating(false);
            return;
          }
        }
      }
      // --- End Validation ---

      // Upload file if selected
      let fileUrl = transaction.document_url;
      if (selectedFile) {
        setIsUploading(true);
        try {
          // Create a unique file path
          const fileExt = selectedFile.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `transaction-documents/${fileName}`;

          console.log(`Uploading file to ${filePath}`);

          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(filePath, selectedFile);

          if (uploadError) {
            toast({
              title: "Upload Failed",
              description: `Failed to upload document: ${uploadError.message}`,
              variant: "destructive",
            });
            setIsUploading(false);
            setIsUpdating(false);
            return;
          }

          // Get the public URL for the file
          const { data: publicUrlData } = await supabase.storage
            .from("documents")
            .getPublicUrl(filePath);

          fileUrl = publicUrlData?.publicUrl || null;
          console.log("File uploaded successfully, URL:", fileUrl);
        } catch (error) {
          console.error("Error uploading file:", error);
          toast({
            title: "Upload Error",
            description:
              "An unexpected error occurred while uploading the file",
            variant: "destructive",
          });
          setIsUploading(false);
          setIsUpdating(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      // Ensure amount is a valid number
      const parsedAmount =
        typeof editedTransaction.amount === "string"
          ? parseFloat(editedTransaction.amount)
          : editedTransaction.amount;

      if (isNaN(parsedAmount)) {
        throw new Error("Invalid amount value");
      }

      // Prepare the update object with ALL fields to ensure complete update
      const updateObject = {
        // Basic transaction fields
        amount: parsedAmount,
        description: editedTransaction.description || null,
        receipt_number: editedTransaction.receipt_number || null,
        agent_id: editedTransaction.agent_id || null,
        document_url: fileUrl,
        review_notes: isAdmin ? editedTransaction.review_notes || null : null,

        // Date handling
        transaction_date: editedTransaction.transaction_date
          ? editedTransaction.transaction_date instanceof Date
            ? editedTransaction.transaction_date.toISOString().split("T")[0]
            : new Date(editedTransaction.transaction_date)
                .toISOString()
                .split("T")[0]
          : null,

        // Spending-specific fields
        ...(editedTransaction.transaction_type === "spending" && {
          spending_category: editedTransaction.spending_category,
          case_number: editedTransaction.case_number?.trim() || null,
          paid_to: editedTransaction.paid_to?.trim() || null,
          ecr_number:
            editedTransaction.spending_category === "Evidence Purchase"
              ? editedTransaction.ecr_number?.trim()
              : null,
          date_to_evidence:
            editedTransaction.spending_category === "Evidence Purchase" &&
            editedTransaction.date_to_evidence
              ? editedTransaction.date_to_evidence instanceof Date
                ? editedTransaction.date_to_evidence.toISOString().split("T")[0]
                : new Date(editedTransaction.date_to_evidence)
                    .toISOString()
                    .split("T")[0]
              : null,
        }),
      };

      console.log(
        "Using dedicated handler to update transaction ID:",
        transaction.id,
      );

      // Use the dedicated transaction update handler
      const result = await updateTransaction(transaction.id, updateObject);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Show success message
      toast({
        title: "Transaction edited",
        description: result.message || "Transaction has been updated",
      });

      // Update the transaction object with the new data
      if (result.data) {
        // Replace the entire transaction object with the updated data
        Object.keys(transaction).forEach((key) => {
          if (key in result.data) {
            transaction[key] = result.data[key];
          }
        });

        // Update state variables
        setReviewNotes(result.data.review_notes || "");
        setStatus(result.data.status || "pending");
        setEditedTransaction(null); // Clear edited transaction
      }

      // Exit edit mode
      setIsEditing(false);

      // Notify parent components of the update
      if (onEdit) onEdit();
      if (onDelete) onDelete(); // Refresh the transaction list

      // Force dialog to close and reopen to ensure fresh data
      onOpenChange(false);
      setTimeout(() => {
        onOpenChange(true);
      }, 100);
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
                
                <!-- Spending Specific Fields START -->
                ${
                  transaction.transaction_type === "spending"
                    ? `
                  ${
                    transaction.spending_category
                      ? `
                    <div class="info-row">
                      <span class="label">Category:</span>
                      <span>${transaction.spending_category}</span>
                    </div>`
                      : ""
                  }
                  ${
                    transaction.case_number
                      ? `
                    <div class="info-row">
                      <span class="label">Case #:</span>
                      <span>${transaction.case_number}</span>
                    </div>`
                      : ""
                  }
                  ${
                    transaction.paid_to
                      ? `
                    <div class="info-row">
                      <span class="label">Paid To:</span>
                      <span>${transaction.paid_to}</span>
                    </div>`
                      : ""
                  }
                   ${
                     transaction.ecr_number
                       ? `
                    <div class="info-row">
                      <span class="label">ECR #:</span>
                      <span>${transaction.ecr_number}</span>
                    </div>`
                       : ""
                   }
                   ${
                     transaction.date_to_evidence
                       ? `
                    <div class="info-row">
                      <span class="label">Date to Evidence:</span>
                      <span>${formatDate(transaction.date_to_evidence)}</span>
                    </div>`
                       : ""
                   }
                `
                    : ""
                }
                <!-- Spending Specific Fields END -->

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
      console.log(
        `[Client] Attempting to delete transaction ID: ${transaction.id}`,
      );
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

  // Function to fetch the latest transaction data
  const fetchUpdatedTransaction = async () => {
    if (!transaction?.id) {
      console.error("Cannot fetch updated transaction: No transaction ID");
      return;
    }

    try {
      console.log(
        "Manually fetching updated transaction data for ID:",
        transaction.id,
      );
      const { data: updatedData, error } = await supabase
        .from("transactions")
        .select("*, agents:agent_id (id, name, badge_number)")
        .eq("id", transaction.id)
        .single();

      if (error) {
        console.error("Error fetching updated transaction:", error);
        return;
      }

      if (updatedData) {
        console.log("Fetched fresh transaction data:", updatedData);

        // Create a completely new transaction object with the updated data
        const updatedTransaction = {
          ...updatedData,
          amount: parseFloat(updatedData.amount),
          description: updatedData.description || "",
          receipt_number: updatedData.receipt_number || "",
          agent_id: updatedData.agent_id || null,
        };

        // CRITICAL: Create a new transaction object and replace the old one
        // This is more reliable than modifying the existing object
        const newTransaction = { ...updatedTransaction };

        // Replace all properties in the original transaction
        Object.keys(transaction).forEach((key) => {
          transaction[key] =
            newTransaction[key] !== undefined
              ? newTransaction[key]
              : transaction[key];
        });

        console.log("Transaction object after update:", transaction);

        // Update all related state variables
        setReviewNotes(updatedData.review_notes || "");
        setStatus(updatedData.status || "pending");
        setEditedTransaction({ ...updatedTransaction }); // Create a new reference

        // Force parent component to update
        if (onEdit) {
          console.log("Calling onEdit callback to update parent component");
          onEdit();
        }
      }
    } catch (err) {
      console.error("Error in fetchUpdatedTransaction:", err);
    }
  };

  // Create a local copy of the transaction for rendering to ensure we're using the latest data
  // When in edit mode, use editedTransaction, otherwise use the original transaction
  const displayTransaction = isEditing ? editedTransaction : transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] w-full max-h-[90vh] overflow-y-auto">
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
              <div className="text-sm font-medium">Transaction Date</div>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editedTransaction?.transaction_date &&
                          "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editedTransaction?.transaction_date ? (
                        format(
                          new Date(editedTransaction.transaction_date),
                          "PPP",
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        editedTransaction?.transaction_date
                          ? new Date(editedTransaction.transaction_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setEditedTransaction({
                          ...editedTransaction,
                          transaction_date: date ? date : null,
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <div>
                  {displayTransaction.transaction_date
                    ? formatDate(displayTransaction.transaction_date)
                    : formatDate(displayTransaction.created_at)}
                </div>
              )}
            </div>

            <div>
              <div className="text-sm font-medium">Created Date</div>
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

          {/* Conditionally render spending fields for display or edit */}
          {displayTransaction.transaction_type === "spending" && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <h4 className="text-md font-medium mb-2">Spending Details</h4>

              {/* Spending Category */}
              <div>
                <div className="text-sm font-medium">Category</div>
                {isEditing ? (
                  <Select
                    value={editedTransaction?.spending_category || ""}
                    onValueChange={(value) =>
                      setEditedTransaction({
                        ...editedTransaction,
                        spending_category: value || null,
                      })
                    }
                    required
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select spending category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CI Payment">CI Payment</SelectItem>
                      <SelectItem value="Evidence Purchase">
                        Evidence Purchase
                      </SelectItem>
                      <SelectItem value="Misc.">Misc.</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div>{displayTransaction?.spending_category || "N/A"}</div>
                )}
              </div>

              {/* Case Number */}
              <div>
                <div className="text-sm font-medium">Case #</div>
                {isEditing ? (
                  <Input
                    value={editedTransaction?.case_number || ""}
                    onChange={(e) =>
                      setEditedTransaction({
                        ...editedTransaction,
                        case_number: e.target.value,
                      })
                    }
                    placeholder="Case Number"
                    className="mt-1"
                    required={
                      editedTransaction?.spending_category ===
                      "Evidence Purchase"
                    }
                  />
                ) : (
                  <div>{displayTransaction?.case_number || "N/A"}</div>
                )}
              </div>

              {/* Paid To */}
              <div>
                <div className="text-sm font-medium">Paid To</div>
                {isEditing ? (
                  <Input
                    value={editedTransaction?.paid_to || ""}
                    onChange={(e) =>
                      setEditedTransaction({
                        ...editedTransaction,
                        paid_to: e.target.value,
                      })
                    }
                    placeholder="Person/Vendor Name"
                    className="mt-1"
                  />
                ) : (
                  <div>{displayTransaction?.paid_to || "N/A"}</div>
                )}
              </div>

              {/* Fields conditional on Evidence Purchase category */}
              {(editedTransaction?.spending_category === "Evidence Purchase" ||
                (!isEditing &&
                  displayTransaction?.spending_category ===
                    "Evidence Purchase")) && (
                <>
                  {/* ECR Number */}
                  <div>
                    <div className="text-sm font-medium">ECR #</div>
                    {isEditing ? (
                      <Input
                        value={editedTransaction?.ecr_number || ""}
                        onChange={(e) =>
                          setEditedTransaction({
                            ...editedTransaction,
                            ecr_number: e.target.value,
                          })
                        }
                        placeholder="ECR Number"
                        className="mt-1"
                        required={
                          editedTransaction?.spending_category ===
                          "Evidence Purchase"
                        }
                      />
                    ) : (
                      <div>{displayTransaction?.ecr_number || "N/A"}</div>
                    )}
                  </div>

                  {/* Date to Evidence */}
                  <div>
                    <div className="text-sm font-medium">Date to Evidence</div>
                    {isEditing ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !editedTransaction?.date_to_evidence &&
                                "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {editedTransaction?.date_to_evidence ? (
                              format(
                                new Date(editedTransaction.date_to_evidence),
                                "PPP",
                              )
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              editedTransaction?.date_to_evidence
                                ? new Date(editedTransaction.date_to_evidence)
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                // Ensure date is set to noon to avoid timezone issues
                                const adjustedDate = new Date(date);
                                adjustedDate.setHours(12, 0, 0, 0);
                                setEditedTransaction({
                                  ...editedTransaction,
                                  date_to_evidence: adjustedDate,
                                });
                              } else {
                                setEditedTransaction({
                                  ...editedTransaction,
                                  date_to_evidence: undefined,
                                });
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div>
                        {displayTransaction?.date_to_evidence
                          ? formatDate(displayTransaction.date_to_evidence)
                          : "N/A"}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

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
              {displayTransaction.status === "rejected" && !isEditing && (
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
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Editing will resubmit this transaction for approval
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Supporting Document Section */}
          <div>
            <div className="text-sm font-medium">Supporting Document</div>
            {isEditing ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    {selectedFile
                      ? selectedFile.name
                      : displayTransaction.document_url
                        ? "Change document"
                        : "Attach document"}
                  </Button>
                  {(selectedFile || displayTransaction.document_url) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedFile(null);
                        if (!isEditing) return;
                        setEditedTransaction({
                          ...editedTransaction,
                          document_url: null,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted formats: PDF, JPG, PNG, DOC, DOCX (max 5MB)
                </p>
              </div>
            ) : displayTransaction.document_url ? (
              <div className="mt-2">
                <a
                  href={displayTransaction.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span className="flex-1 truncate">View Document</span>
                  <Download className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-1">
                No document attached
              </div>
            )}
          </div>

          {/* Status and Review Notes section - show when admin is viewing pending transaction OR when admin is editing any transaction */}
          {(isAdmin && displayTransaction.status === "pending" && !isEditing) ||
          (isAdmin && isEditing) ? (
            <div className="border-t pt-4 mt-4">
              <div className="text-sm font-medium mb-2">Review Transaction</div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Update Status</Label>
                  {isEditing ? (
                    <Select
                      value={editedTransaction.status}
                      onValueChange={(value) =>
                        setEditedTransaction({
                          ...editedTransaction,
                          status: value as TransactionStatus,
                        })
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
                  ) : (
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
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-notes">Review Notes</Label>
                  {isEditing ? (
                    <Textarea
                      id="review-notes-edit"
                      value={editedTransaction.review_notes}
                      onChange={(e) =>
                        setEditedTransaction({
                          ...editedTransaction,
                          review_notes: e.target.value,
                        })
                      }
                      placeholder="Add notes about this transaction"
                    />
                  ) : (
                    <Textarea
                      id="review-notes"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about this transaction"
                    />
                  )}
                </div>

                {!isEditing && (
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
                )}
              </div>
            </div>
          ) : null}
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

            {/* Allow anyone to edit transactions */}
            {!isEditing && (
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
