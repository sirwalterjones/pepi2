"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { AuditLog } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Download } from "lucide-react";

interface AuditLogWithUser extends AuditLog {
  user?: {
    email: string;
    user_metadata?: {
      full_name?: string;
    };
  } | null;
}

export default function AuditLogList() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: "",
    entityType: "",
    fromDate: "",
    toDate: "",
    search: "",
  });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  // Action types for filtering
  const actionTypes = [
    { value: "", label: "All Actions" },
    { value: "login", label: "Login" },
    { value: "logout", label: "Logout" },
    { value: "create", label: "Create" },
    { value: "update", label: "Update" },
    { value: "delete", label: "Delete" },
    { value: "approve", label: "Approve" },
    { value: "reject", label: "Reject" },
    { value: "email.sent", label: "Email Sent" },
    { value: "email.delivered", label: "Email Delivered" },
    { value: "email.opened", label: "Email Opened" },
    { value: "email.clicked", label: "Email Clicked" },
  ];

  // Entity types for filtering
  const entityTypes = [
    { value: "", label: "All Entities" },
    { value: "user", label: "User" },
    { value: "transaction", label: "Transaction" },
    { value: "fund_request", label: "Fund Request" },
    { value: "ci_payment", label: "CI Payment" },
    { value: "email", label: "Email" },
    { value: "pepi_book", label: "PEPI Book" },
  ];

  const fetchLogs = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 0 : page;

      let query = supabase
        .from("audit_logs")
        .select(
          `
          *,
          user:auth.users!audit_logs_user_id_fkey(email, user_metadata)
        `,
        )
        .order("timestamp", { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      // Apply filters
      if (filter.action) {
        query = query.eq("action", filter.action);
      }

      if (filter.entityType) {
        query = query.eq("entity_type", filter.entityType);
      }

      if (filter.fromDate) {
        query = query.gte("timestamp", filter.fromDate);
      }

      if (filter.toDate) {
        query = query.lte("timestamp", filter.toDate);
      }

      if (filter.search) {
        // Search in JSON details field
        query = query.or(
          `details.ilike.%${filter.search}%,entity_id.ilike.%${filter.search}%`,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching audit logs:", error);
        return;
      }

      if (reset) {
        setLogs(data as AuditLogWithUser[]);
        setPage(0);
      } else {
        setLogs((prev) => [...prev, ...(data as AuditLogWithUser[])]);
      }

      setHasMore(data.length === pageSize);
    } catch (error) {
      console.error("Error in fetchLogs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
  }, [filter]);

  const loadMore = () => {
    setPage((prev) => prev + 1);
    fetchLogs();
  };

  const handleFilterChange = (key: keyof typeof filter, value: string) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilter({
      action: "",
      entityType: "",
      fromDate: "",
      toDate: "",
      search: "",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  const getActionColor = (action: string) => {
    if (action.includes("login"))
      return "bg-green-100 text-green-800 border-green-200";
    if (action.includes("logout"))
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (action.includes("create"))
      return "bg-blue-100 text-blue-800 border-blue-200";
    if (action.includes("update"))
      return "bg-purple-100 text-purple-800 border-purple-200";
    if (action.includes("delete"))
      return "bg-red-100 text-red-800 border-red-200";
    if (action.includes("approve"))
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (action.includes("reject"))
      return "bg-orange-100 text-orange-800 border-orange-200";
    if (action.includes("email"))
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;

    // Create CSV content
    const headers = [
      "Timestamp",
      "User",
      "IP Address",
      "Action",
      "Entity Type",
      "Entity ID",
      "Details",
    ];
    const csvRows = [
      headers.join(","),
      ...logs.map((log) => {
        const user = log.user?.email || "System";
        const details = JSON.stringify(log.details || {}).replace(/"/g, '""'); // Escape quotes for CSV

        return [
          formatDate(log.timestamp),
          user,
          log.ip_address || "N/A",
          log.action,
          log.entity_type || "N/A",
          log.entity_id || "N/A",
          `"${details}"`, // Wrap JSON in quotes
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Create download link and trigger click
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `audit-logs-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>System Audit Logs</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchLogs(true)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </CardTitle>

        {/* Filters */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search logs..."
                value={filter.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full"
              />
            </div>

            <Select
              value={filter.action}
              onValueChange={(value) => handleFilterChange("action", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.entityType}
              onValueChange={(value) => handleFilterChange("entityType", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                {entityTypes.map((entity) => (
                  <SelectItem key={entity.value} value={entity.value}>
                    {entity.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {logs.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching your criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col">
                      <Badge
                        variant="outline"
                        className={getActionColor(log.action)}
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">User:</span>{" "}
                      {log.user ? (
                        <span>
                          {log.user.user_metadata?.full_name || log.user.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">IP:</span>{" "}
                      <span className="font-mono text-xs">
                        {log.ip_address || "N/A"}
                      </span>
                    </div>
                  </div>

                  {(log.entity_type || log.entity_id) && (
                    <div className="text-sm mt-2">
                      <span className="font-medium">Entity:</span>{" "}
                      {log.entity_type && (
                        <span className="mr-2">{log.entity_type}</span>
                      )}
                      {log.entity_id && (
                        <span className="font-mono text-xs">
                          {log.entity_id}
                        </span>
                      )}
                    </div>
                  )}

                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="mt-2 text-sm">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                          Details
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted p-2 rounded-md overflow-auto max-h-[200px]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
