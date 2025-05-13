import { cn } from "@/lib/utils";

// Import the dashboard navbar directly from the .tsx file instead of .jsx
import DashboardNavbar from "@/components/dashboard-navbar";

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
