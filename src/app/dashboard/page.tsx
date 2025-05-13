import AdminDashboardActions from "@/components/dashboard/AdminDashboardActions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <AdminDashboardActions />
    </div>
  );
}
