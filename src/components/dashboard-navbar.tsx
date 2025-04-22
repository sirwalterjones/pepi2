"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  UserCircle,
  Home,
  DollarSign,
  Users,
  FileText,
  BarChart3,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardNavbar() {
  const supabase = createClient();
  const router = useRouter();
  const [pathname, setPathname] = useState("");

  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get the current pathname from window.location
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
    }

    const fetchUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: agentData } = await supabase
            .from("agents")
            .select("role")
            .eq("user_id", user.id)
            .single();

          if (agentData) {
            setUserRole(agentData.role);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
      showFor: ["admin", "agent"],
    },
    {
      name: "Transactions",
      href: "/dashboard/transactions",
      icon: <DollarSign className="h-5 w-5" />,
      showFor: ["admin", "agent"],
    },
    {
      name: "PEPI Books",
      href: "/dashboard/pepi-books",
      icon: <FileText className="h-5 w-5" />,
      showFor: ["admin"],
    },
    {
      name: "Agents",
      href: "/dashboard/agents",
      icon: <Users className="h-5 w-5" />,
      showFor: ["admin"],
    },
    {
      name: "Reports",
      href: "/dashboard/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      showFor: ["admin"],
    },

    {
      name: "Receipts",
      href: "/dashboard/receipts",
      icon: <FileText className="h-5 w-5" />,
      showFor: ["admin", "agent"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    !userRole || isLoading ? true : item.showFor.includes(userRole),
  );

  return (
    <nav className="w-full border-b border-gray-200 bg-white py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold flex items-center">
            <DollarSign className="h-6 w-6 mr-2 text-primary" />
            PEPI Money Tracker
          </Link>
          <div className="hidden md:flex items-center space-x-1 ml-6">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <UserCircle className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Profile Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.refresh();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="md:hidden container mx-auto px-4 py-2 overflow-x-auto">
        <div className="flex space-x-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
