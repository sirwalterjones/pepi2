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
import TransactionList from "@/components/transactions/TransactionList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PendingCiPaymentsList from "@/components/ci-payments/PendingCiPaymentsList";
import AdminDashboardActions from "@/components/dashboard/AdminDashboardActions";

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
  let currentAgentData: Agent | null = null; // Variable to hold agent data

  console.log(`Dashboard Page: Checking agent role for user_id: ${user.id}`); // Log before agent check
  const { data: agentDataResult, error: agentError } = await supabase
    .from("agents")
    .select("*, role") // Fetch all agent data and role
    .eq("user_id", user.id)
    .single();

  console.log("Dashboard Page: Agent query result", { agentDataResult, agentError }); // Log agent query result

  if (agentError && agentError.code !== 'PGRST116') { // Ignore error if it's just 'no rows found'
      console.error("Dashboard Page: Error fetching agent data:", agentError);
      // Decide if we should redirect or show an error message
  }

  if (agentDataResult) {
    userRole = agentDataResult.role;
    currentAgentData = agentDataResult as Agent; // Store the fetched agent data
    isAgent = true;
    isAdmin = agentDataResult.role === "admin";
    console.log(`Dashboard Page: Agent role found: ${userRole}`); // Log found role
  } else {
      console.log("Dashboard Page: No agent record found for user."); // Log if no agent found
  }

  // Fetch Active PEPI Book (only needed for admin view)
  let activeBook: PepiBook | null = null;
  if (isAdmin) {
      const { data: bookData, error: bookError } = await supabase
          .from('pepi_books')
          .select('*')
          .eq('is_active', true)
          .maybeSingle(); 
      if (bookError) {
          console.error("Dashboard Page: Error fetching active PEPI Book:", bookError);
      } else {
          activeBook = bookData;
          console.log(`Dashboard Page: Fetched active book: ${activeBook ? activeBook.year : 'None'}`);
      }
  }

  console.log("Dashboard Page: Final roles", { isAgent, isAdmin }); // Log final roles

  let dashboardContent = null;
  if (isAgent && !isAdmin) {
    console.log("Dashboard Page: Rendering AgentDashboard");
    dashboardContent = <AgentDashboard />;
  } else if (isAdmin) {
    console.log("Dashboard Page: Rendering Admin View (Pending Requests + Overview + Transactions)");
    dashboardContent = (
      <div className="space-y-8">
        {/* Moved Active PEPI Book Notice Here */}
        {activeBook ? (
          <div className="bg-muted p-4 rounded-lg border">
            <h2 className="text-lg font-medium">
              Active PEPI Book: {activeBook.year}
            </h2>
            <p className="text-sm text-muted-foreground">
              All statistics and lists below are filtered for this active PEPI book.
            </p>
          </div>
        ) : (
           <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
             <h2 className="text-lg font-medium">
               No Active PEPI Book
             </h2>
             <p className="text-sm">
               Please activate a PEPI Book in the settings to view dashboard data.
             </p>
           </div>
        )}
        {/* Admin-specific cards in a grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PendingRequestsList />
          <PendingCiPaymentsList activeBookId={activeBook?.id || null} />
        </div>
        <DashboardOverview />
        <TransactionList />
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
               {/* Render Admin Actions Button Area Here */}
               {isAdmin && (
                 <AdminDashboardActions 
                    userId={user?.id || null}
                    isAdmin={isAdmin}
                    activeBook={activeBook}
                    currentAgentData={currentAgentData}
                  />
               )}
            </div>
            <p className="text-muted-foreground">
              Welcome to the PEPI Money Tracker dashboard. Monitor fund
              activities and manage transactions.
            </p>
          </header>

          {/* Dashboard Content */}
          {dashboardContent} { /* Render the determined content */}

          {/* User Profile Section REMOVED
          <section className="bg-card rounded-xl p-6 border shadow-sm">
             ... (entire section content) ...
          </section>
          */}
        </div>
      </main>
    </>
  );
}
