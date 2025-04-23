import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import ReportGenerator from "@/components/reports/ReportGenerator";
import AgentMonthlyReport from "@/components/reports/AgentMonthlyReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            Generate and export transaction reports for documentation and
            auditing.
          </p>
        </header>

        <Tabs defaultValue="custom" className="w-full">
          <TabsList className="grid w-full md:w-[600px] grid-cols-3">
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Agent Reports</TabsTrigger>
            <TabsTrigger value="monthly-report">Monthly Report</TabsTrigger>
          </TabsList>

          <TabsContent value="custom" className="mt-6 space-y-6">
            <ReportGenerator />
            <Card>
              <CardHeader>
                <CardTitle>Monthly Reconciliation Memo (CB Memo)</CardTitle>
                <CardDescription>
                  Generate the official monthly PEPI fund reconciliation memorandum for the selected month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/reports/custom/cb-memo" passHref>
                  <Button>Generate CB Memo</Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="mt-6">
            <AgentMonthlyReport />
          </TabsContent>

          <TabsContent value="monthly-report" className="mt-6">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Report</CardTitle>
                  <CardDescription>
                    View the current month's transaction report.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/monthly-report" passHref>
                    <Button>View Monthly Report</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
