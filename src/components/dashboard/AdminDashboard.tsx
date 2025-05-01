"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import DashboardOverview from "./DashboardOverview";
import AdminDashboardActions from "./AdminDashboardActions";
import PendingRequestsList from "../requests/PendingRequestsList";
import { Agent, PepiBook } from "@/types/schema";
import { usePepiBooks } from "@/hooks/usePepiBooks";

export default function AdminDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAgentData, setCurrentAgentData] = useState<Agent | null>(null);
  const supabase = createClient();
  const { activeBook } = usePepiBooks();

  useEffect(() => {
    async function getUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          // Get agent data including role
          const { data: agentData, error: agentError } = await supabase
            .from("agents")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (agentError) {
            console.error("Error fetching agent data:", agentError);
            return;
          }

          if (agentData) {
            setCurrentAgentData(agentData);
            setIsAdmin(agentData.role === "admin");
          }
        }
      } catch (error) {
        console.error("Error getting user data:", error);
      }
    }

    getUserData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {activeBook ? `PEPI Book ${activeBook.year}` : "Dashboard"}
        </h2>
        <AdminDashboardActions
          userId={userId}
          isAdmin={isAdmin}
          activeBook={activeBook || null}
          currentAgentData={currentAgentData}
        />
      </div>

      <DashboardOverview />

      {/* Only show pending requests to admins */}
      {isAdmin && activeBook && (
        <div className="mt-6">
          <PendingRequestsList key={activeBook.id} />
        </div>
      )}
    </div>
  );
}
