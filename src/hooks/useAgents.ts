"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { Agent } from "@/types/schema";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
  const supabase = createClient();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        // Fetch all agents, including inactive ones
        // .eq("is_active", true)
        .order("name");

      if (error) {
        throw new Error(error.message);
      }

      setAgents(data || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setAgents([]); // Ensure agents is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agentId: string) => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      // Direct database operation since server action is not available
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", agentId);

      if (error) {
        throw new Error(error.message || "Failed to delete agent");
      }

      // No need to manually update the agents array as the real-time subscription will trigger a refetch
      return { success: true };
    } catch (err) {
      console.error("Error deleting agent:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setDeleteError(err instanceof Error ? err : new Error(String(err)));
      return { success: false, error: errorMessage };
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();

    // Set up real-time subscription for agents
    const subscription = supabase
      .channel("agents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        () => {
          fetchAgents();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    agents,
    loading,
    error,
    deleteLoading,
    deleteError,
    deleteAgent,
    refetch: fetchAgents,
  };
}
