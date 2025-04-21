import { redirect } from "next/navigation";
import { createClient } from "../../../../supabase/server";
import ReportGenerator from "@/components/reports/ReportGenerator";
import AgentMonthlyReport from "@/components/reports/AgentMonthlyReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

          <TabsContent value="custom" className="mt-6">
            <ReportGenerator />
          </TabsContent>

          <TabsContent value="monthly" className="mt-6">
            <AgentMonthlyReport />
          </TabsContent>

          <TabsContent value="monthly-report" className="mt-6">
            <div className="flex flex-col gap-4">
              <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-xl font-semibold mb-4">Monthly Report</h2>
                <p className="text-muted-foreground mb-4">
                  View the current month's transaction report.
                </p>
                <a
                  href="/dashboard/monthly-report"
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  View Monthly Report
                </a>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
