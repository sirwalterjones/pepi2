import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import ReportGenerator from "@/components/reports/ReportGenerator";
import AgentMonthlyReport from "@/components/reports/AgentMonthlyReport";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return (
    <main className="w-full">
      <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and view various financial reports for documentation and auditing.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Transaction Report</CardTitle>
              <CardDescription>
                Generate a detailed transaction report based on custom date ranges and filters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportGenerator />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Reconciliation Memo (CB Memo)</CardTitle>
              <CardDescription>
                Generate the official monthly PEPI fund reconciliation memorandum for a selected month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/reports/custom/cb-memo" passHref>
                <Button>Generate CB Memo</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Agent Report</CardTitle>
              <CardDescription>
                View a summary of monthly activity for a specific agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentMonthlyReport />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Unit Report</CardTitle>
              <CardDescription>
                View the consolidated transaction report for the unit for a selected month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/monthly-report" passHref>
                <Button>View Monthly Unit Report</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
