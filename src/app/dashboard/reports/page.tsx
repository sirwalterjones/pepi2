import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import ReportGenerator from "@/components/reports/ReportGenerator";
import AgentMonthlyReport from "@/components/reports/AgentMonthlyReport";
import MonthlyUnitReport from "@/components/reports/MonthlyUnitReport";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
        <header className="flex flex-col gap-4 hide-on-print">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and view various financial reports for documentation and auditing.
          </p>
        </header>

        <div className="flex flex-col space-y-8">
          <Card className="hide-on-print">
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

          <Card className="hide-on-print">
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

          <Card className="hide-on-print">
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

          <Card className="report-card-container">
            <CardHeader className="hide-on-print">
              <CardTitle>Monthly Unit Report</CardTitle>
              <CardDescription>
                View the consolidated transaction report for the unit for a selected month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyUnitReport />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
