import { createClient } from "../../../../supabase/server";
import { redirect } from "next/navigation";
import AuditLogList from "@/components/audit/AuditLogList";
import { FileText } from "lucide-react";

export const revalidate = 0; // Prevent caching for dynamic data

export default async function AuditLogsPage() {
  const supabase = await createClient();

  // Verify user is authenticated and is an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if user is an admin
  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (agentError || !agentData || agentData.role !== "admin") {
    // Not an admin, redirect to dashboard
    return redirect("/dashboard");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">System Audit Logs</h1>
      <p className="text-muted-foreground mb-6">
        View a comprehensive audit trail of all system activities, including
        user logins, transactions, approvals, and email events.
      </p>

      <AuditLogList />
    </div>
  );
}
