"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Printer,
  Download,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { TransactionType } from "@/types/schema";
import ReceiptTemplate from "./ReceiptTemplate";

export default function ReceiptManager() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole !== null || currentAgentId !== null) {
      fetchTransactions();
    }
  }, [userRole, currentAgentId]);

  const fetchUserRole = async () => {
    try {
      // Get the current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get the agent record for the current user
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

      if (agentError) {
        console.error("Error fetching agent data:", agentError);
        return;
      }

      if (agentData) {
        setUserRole(agentData.role);
        setCurrentAgentId(agentData.id);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("transactions")
        .select(
          `
          *,
          agents:agent_id (id, name, badge_number)
        `,
        )
        .not("receipt_number", "is", null)
        .order("created_at", { ascending: false });

      // If user is an agent (not admin), only show their receipts
      if (userRole === "agent" && currentAgentId) {
        query = query.eq("agent_id", currentAgentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching transactions:", error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    return (
      transaction.receipt_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.agents?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "issuance":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "spending":
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      case "return":
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      default:
        return <DollarSign className="h-4 w-4" />;
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
            variant="success"
            className="bg-green-100 text-green-800 hover:bg-green-100"
          >
            Returned
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

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

  const handlePrintReceipt = () => {
    if (!selectedReceipt) return;

    // Use the receipt generator utility
    import("./ReceiptGenerator")
      .then(({ printReceipt }) => {
        printReceipt(selectedReceipt);
      })
      .catch((error) => {
        console.error("Error loading receipt generator:", error);
        // Fallback to inline implementation if module fails to load
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
          <html>
            <head>
              <title>Receipt #${selectedReceipt.receipt_number}</title>
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
                    <span>${selectedReceipt.receipt_number}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Date:</span>
                    <span>${formatDate(selectedReceipt.created_at)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Transaction Type:</span>
                    <span>${selectedReceipt.transaction_type.charAt(0).toUpperCase() + selectedReceipt.transaction_type.slice(1)}</span>
                  </div>
                  ${
                    selectedReceipt.agents
                      ? `
                  <div class="info-row">
                    <span class="label">Agent:</span>
                    <span>${selectedReceipt.agents.name} ${selectedReceipt.agents.badge_number ? `(${selectedReceipt.agents.badge_number})` : ""}</span>
                  </div>`
                      : ""
                  }
                  ${
                    selectedReceipt.description
                      ? `
                  <div class="info-row">
                    <span class="label">Description:</span>
                    <span>${selectedReceipt.description}</span>
                  </div>`
                      : ""
                  }
                </div>
                
                <div class="amount">
                  ${formatCurrency(selectedReceipt.amount)}
                </div>
                
                <div class="footer">
                  <p>Thank you for using PEPI Money Tracker</p>
                  <p>This is an official receipt for task force financial records.</p>
                </div>
              </div>
              <script>
                // Auto-print when loaded
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
          printWindow.document.close();
        }
      });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction Receipts</CardTitle>
        <CardDescription>
          {userRole === "admin"
            ? "View and print receipts for all transactions"
            : "View and print receipts for your transactions"}
        </CardDescription>
        <div className="relative flex-1 mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by receipt number, description, or agent..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm
              ? "No matching receipts found"
              : "No receipts available"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-full">
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div>
                    <div className="font-medium">
                      Receipt #{transaction.receipt_number}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{formatDate(transaction.created_at)}</span>
                      <span>•</span>
                      <span>
                        {transaction.agents
                          ? `${transaction.agents.name} ${transaction.agents.badge_number ? `(${transaction.agents.badge_number})` : ""}`
                          : "No agent"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div
                      className={`font-medium ${transaction.transaction_type === "issuance" ? "text-red-600" : transaction.transaction_type === "return" ? "text-green-600" : ""}`}
                    >
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div>
                      {getTransactionBadge(transaction.transaction_type)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReceipt(transaction);
                        setIsReceiptOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReceipt(transaction);
                        handlePrintReceipt();
                      }}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export All Receipts
        </Button>
      </CardFooter>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Receipt #{selectedReceipt?.receipt_number}
            </DialogTitle>
            <DialogDescription>
              Transaction from{" "}
              {selectedReceipt && formatDate(selectedReceipt.created_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="mt-4">
              <ReceiptTemplate transaction={selectedReceipt} />
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsReceiptOpen(false)}
                >
                  Close
                </Button>
                <Button onClick={handlePrintReceipt}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
