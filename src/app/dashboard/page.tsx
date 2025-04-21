import DashboardNavbar from "@/components/dashboard-navbar";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import AgentDashboard from "@/components/dashboard/AgentDashboard";
import { InfoIcon, UserCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { createClient } from "../../../supabase/server";
import { Badge } from "@/components/ui/badge";
import { Agent, PepiBook } from "@/types/schema";
import PendingRequestsList from "@/components/requests/PendingRequestsList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const revalidate = 0; // Prevent caching for dynamic data

export default async function Dashboard() {
  console.log("--- Dashboard Page Load Start ---"); // Add log
  const supabase = await createClient();

  const {
    data: { user }, error: userError // Capture user fetch error
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Dashboard Page: User fetch failed or no user", { userError }); // Log error
    return redirect("/sign-in");
  }
  console.log(`Dashboard Page: User authenticated: ${user.id} (${user.email})`); // Log user info

  // Check if user is an agent or admin
  let userRole = "user";
  let isAgent = false;
  let isAdmin = false;

  console.log(`Dashboard Page: Checking agent role for user_id: ${user.id}`); // Log before agent check
  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("role")
    .eq("user_id", user.id)
    .single();

  console.log("Dashboard Page: Agent query result", { agentData, agentError }); // Log agent query result

  if (agentError && agentError.code !== 'PGRST116') { // Ignore error if it's just 'no rows found'
      console.error("Dashboard Page: Error fetching agent data:", agentError);
      // Decide if we should redirect or show an error message
  }

  if (agentData) {
    userRole = agentData.role;
    isAgent = true;
    isAdmin = agentData.role === "admin";
    console.log(`Dashboard Page: Agent role found: ${userRole}`); // Log found role
  } else {
      console.log("Dashboard Page: No agent record found for user."); // Log if no agent found
  }

  console.log("Dashboard Page: Final roles", { isAgent, isAdmin }); // Log final roles

  let dashboardContent = null;
  if (isAgent && !isAdmin) {
    console.log("Dashboard Page: Rendering AgentDashboard");
    dashboardContent = <AgentDashboard />;
  } else if (isAdmin) {
    console.log("Dashboard Page: Rendering Admin View (Overview + Pending Requests)");
    dashboardContent = (
      <div className="space-y-8">
        <DashboardOverview />
        <PendingRequestsList />
      </div>
    );
  } else {
    console.log("Dashboard Page: Rendering message for non-agent/non-admin user");
    dashboardContent = (
      <Card>
        <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
        <CardContent><p>Your account is not associated with an agent profile.</p></CardContent>
      </Card>
    );
  }

  return (
    <>
      <main className="w-full">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Dashboard</h1>
              {isAdmin && (
                <Badge
                  variant="outline"
                  className="bg-blue-100 text-blue-800 border-blue-200"
                >
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                  Admin
                </Badge>
              )}
              {isAgent && !isAdmin && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-800 border-green-200"
                >
                  Agent
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Welcome to the PEPI Money Tracker dashboard. Monitor fund
              activities and manage transactions.
            </p>
          </header>

          {/* Dashboard Content */}
          {dashboardContent} { /* Render the determined content */}

          {/* User Profile Section */}
          <section className="bg-card rounded-xl p-6 border shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <UserCircle size={48} className="text-primary" />
              <div>
                <h2 className="font-semibold text-xl">User Profile</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Account Information
                  </h3>
                  <div className="mt-2 space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Email</span>
                      <span>{user.email}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">User ID</span>
                      <span className="font-mono text-xs">
                        {user.id.substring(0, 12)}...
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Email Verified</span>
                      <span>{user.email_confirmed_at ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Last Sign In</span>
                      <span>
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Authentication Details
                  </h3>
                  <div className="mt-2 space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Provider</span>
                      <span className="capitalize">
                        {user.app_metadata?.provider || "email"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Created</span>
                      <span>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Updated</span>
                      <span>
                        {user.updated_at
                          ? new Date(user.updated_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="font-medium">Role</span>
                      <span className="capitalize">{userRole}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/reset-password">Change Password</a>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
