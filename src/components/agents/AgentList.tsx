"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import { Agent } from "@/types/schema";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Search,
  Plus,
  UserCircle,
  Shield,
  Edit,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Input } from "../ui/input";
import { useAgents } from "@/hooks/useAgents";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useToast } from "../ui/use-toast";
import AgentFormWrapper from "./AgentFormWrapper";

export default function AgentList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const {
    agents,
    loading,
    error,
    deleteLoading,
    deleteError,
    deleteAgent,
    refetch,
  } = useAgents();
  const { toast } = useToast();
  const supabase = createClient();

  // Listen for messages from AgentFormWrapper
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "agent-form-success") {
        // Close the dialog and refresh the agent list
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
        refetch();

        // Show success toast
        toast({
          title: "Success",
          description: selectedAgent
            ? "Agent updated successfully"
            : "Agent added successfully",
        });
      } else if (event.data?.type === "agent-form-cancel") {
        // Just close the dialog
        setIsAddDialogOpen(false);
        setIsEditDialogOpen(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedAgent, refetch, toast]);

  const filteredAgents = agents.filter((agent) => {
    return (
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.badge_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Agents</CardTitle>
            <CardDescription>
              Manage task force agents and their access
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Agent
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name, badge number, or email..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Error loading agents: {error.message}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No matching agents found" : "No agents yet"}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-lg p-4 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-muted rounded-full">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {agent.name}
                      {!agent.is_active && (
                        <Badge
                          variant="outline"
                          className="text-red-500 border-red-200 bg-red-50"
                        >
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {agent.badge_number || "No badge number"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {agent.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{agent.email}</span>
                    </div>
                  )}
                  {agent.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{agent.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="flex items-center gap-1">
                      {agent.role === "admin" ? (
                        <>
                          <Shield className="h-3 w-3 text-primary" />
                          Administrator
                        </>
                      ) : (
                        "Agent"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Added:</span>
                    <span>
                      {new Date(agent.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-auto flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={agent.is_active ? "ghost" : "outline"}
                    size="sm"
                    className={
                      agent.is_active
                        ? "text-red-500 hover:text-red-700 hover:bg-red-50"
                        : "text-green-600 hover:text-green-700 hover:bg-green-50"
                    }
                    onClick={() => {
                      setSelectedAgent(agent);
                      setIsDeactivateDialogOpen(true);
                    }}
                  >
                    {agent.is_active ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M18 6 6 18"></path>
                          <path d="m6 6 12 12"></path>
                        </svg>
                        Deactivate
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export Agents
        </Button>
      </CardFooter>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
            <DialogDescription>
              Enter the details for the new agent. All agents will be able to
              receive and manage funds.
            </DialogDescription>
          </DialogHeader>
          <AgentFormWrapper onSuccessUrl="#success" onCancelUrl="#cancel" />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update the details for {selectedAgent?.name}.
            </DialogDescription>
          </DialogHeader>
          {selectedAgent && (
            <AgentFormWrapper
              agent={selectedAgent}
              onSuccessUrl="#success"
              onCancelUrl="#cancel"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedAgent?.is_active ? "Deactivate" : "Activate"} Agent
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAgent?.is_active
                ? "This will deactivate the agent. They will no longer appear in selection dropdowns and won't be able to receive funds."
                : "This will reactivate the agent. They will appear in selection dropdowns and will be able to receive funds."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedAgent) return;

                try {
                  const { error } = await supabase
                    .from("agents")
                    .update({
                      is_active: !selectedAgent.is_active,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", selectedAgent.id);

                  if (error) throw error;

                  toast({
                    title: selectedAgent.is_active
                      ? "Agent deactivated"
                      : "Agent activated",
                    description: `${selectedAgent.name} has been ${selectedAgent.is_active ? "deactivated" : "activated"} successfully.`,
                  });

                  // Refresh the agent list
                  refetch();
                } catch (error: any) {
                  console.error("Error updating agent status:", error);
                  toast({
                    title: "Error",
                    description:
                      error.message || "Failed to update agent status.",
                    variant: "destructive",
                  });
                }
              }}
              className={
                selectedAgent?.is_active
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {selectedAgent?.is_active ? (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-4 w-4"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Activate
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              agent "{selectedAgent?.name}" and remove all their data from the
              system. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedAgent) return;

                try {
                  const { success, error } = await deleteAgent(
                    selectedAgent.id,
                  );

                  if (!success) throw new Error(error);

                  toast({
                    title: "Agent deleted",
                    description: `${selectedAgent.name} has been permanently deleted.`,
                  });

                  // The agent list will be refreshed automatically via the real-time subscription
                } catch (error: any) {
                  console.error("Error deleting agent:", error);
                  toast({
                    title: "Error",
                    description: error.message || "Failed to delete agent.",
                    variant: "destructive",
                  });
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
