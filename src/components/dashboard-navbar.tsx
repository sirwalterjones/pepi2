import { Home, Shield, FileText, Users, BarChart3 } from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    showFor: ["admin"],
  },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
    icon: <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />,
    showFor: ["admin", "agent"],
  },
  {
    name: "CI History",
    href: "/dashboard/ci-history",
    icon: <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
    showFor: ["admin", "agent"],
  },
  {
    name: "PEPI Books",
    href: "/dashboard/pepi-books",
    icon: <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    showFor: ["admin"],
  },
  {
    name: "Agents",
    href: "/dashboard/agents",
    icon: <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    showFor: ["admin"],
  },
  {
    name: "Reports",
    href: "/dashboard/reports",
    icon: <BarChart3 className="h-5 w-5 text-red-600 dark:text-red-400" />,
    showFor: ["admin"],
  },
  {
    name: "Receipts",
    href: "/dashboard/receipts",
    icon: <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />,
    showFor: ["admin", "agent"],
  },
  {
    name: "Audit Logs",
    href: "/dashboard/audit-logs",
    icon: <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
    showFor: ["admin"],
  },
];

export { navItems };
