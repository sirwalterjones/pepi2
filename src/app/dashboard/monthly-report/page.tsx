"use client";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/auth";
import MonthlyReport from "@/components/reports/MonthlyReport";
import AgentMonthlyReport from "@/components/reports/AgentMonthlyReport";

export default function MonthlyReportPage() {
  return (
    <main className="w-full">
      <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
        <MonthlyReport />
        <AgentMonthlyReport />
      </div>
    </main>
  );
}
