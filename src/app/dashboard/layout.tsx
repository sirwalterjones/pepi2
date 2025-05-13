import DashboardNavbar from "@/components/dashboard-navbar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col max-w-[100vw] overflow-x-hidden">
      <div className="hide-on-print">
        <DashboardNavbar />
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
