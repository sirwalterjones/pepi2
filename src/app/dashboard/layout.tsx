import { cn } from "@/lib/utils";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Import the navItems from dashboard-navbar
import { navItems } from "@/components/dashboard-navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col max-w-[100vw] overflow-x-hidden">
      <div className="hide-on-print bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">PEPI Tracker</span>
          </div>
          <nav>
            <ul className="flex space-x-4">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md hover:bg-gray-100"
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
