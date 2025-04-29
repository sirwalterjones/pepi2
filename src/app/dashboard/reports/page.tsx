import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, BarChart, Users, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Reports | PEPI Money Tracker",
  description: "Generate and view reports for PEPI fund transactions.",
};

export default function ReportsPage() {
  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate and view reports for PEPI fund transactions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Custom Transaction Report
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Generate a detailed transaction report based on custom date
                ranges and filters.
              </div>
              <Link href="/dashboard/reports/custom" passHref>
                <Button>Generate Report</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Reconciliation Memo
              </CardTitle>
              <BarChart className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Generate the official monthly PEPI fund reconciliation
                memorandum.
              </div>
              <Link href="/dashboard/reports/custom/cb-memo" passHref>
                <Button>Generate CB Memo</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Agent Report
              </CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                View a summary of monthly activity for a specific agent.
              </div>
              <Link href="/dashboard/monthly-report" passHref>
                <Button>View Agent Report</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Unit Report
              </CardTitle>
              <Calendar className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                View the consolidated transaction report for the unit for a
                selected month.
              </div>
              <Link href="/dashboard/monthly-report" passHref>
                <Button>View Unit Report</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
