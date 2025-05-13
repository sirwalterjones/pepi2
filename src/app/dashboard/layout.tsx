import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

// Use dynamic import with no SSR to avoid hydration issues
const DashboardNavbar = dynamic(
  () => import("@/components/dashboard-navbar.jsx"),
  {
    ssr: false,
  },
);

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
