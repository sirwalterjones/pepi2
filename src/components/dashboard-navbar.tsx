"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
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
  Shield,
  Users,
  FileText,
  BarChart3,
  Menu,
} from "lucide-react";
import { ThemeSwitcher } from "./theme-switcher";
import { useRouter } from "next/navigation";

export default function DashboardNavbar() {
  const supabase = createClient();
  const router = useRouter();
  const [pathname, setPathname] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
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
      icon: (
        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      ),
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
  ];

  const filteredNavItems = navItems.filter((item) =>
    !userRole || isLoading ? true : item.showFor.includes(userRole),
  );

  const renderNavLinks = (isMobile: boolean = false) => {
    return filteredNavItems.map((item) => {
      const itemHref =
        item.name === "Dashboard" && userRole === "agent"
          ? "/dashboard/transactions"
          : item.href;
      const isActive = pathname === itemHref;
      return (
        <Link
          key={item.href}
          href={itemHref}
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={cn(
            "flex items-center text-sm font-medium",
            isMobile
              ? `px-4 py-3 rounded-md w-full ${isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100"}`
              : `px-3 py-2 rounded-md ${isActive ? "bg-primary/10 text-primary" : "text-gray-700 hover:bg-gray-100"}`,
          )}
        >
          <span className="mr-2">{item.icon}</span>
          {item.name}
        </Link>
      );
    });
  };

  return (
    <nav className="w-full border-b border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 py-2 sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xl font-bold flex items-center shrink-0"
          >
            <Shield className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">PEPI Money Tracker</span>
            <span className="sm:hidden">PEPI</span>
          </Link>
          <div className="hidden md:flex items-center space-x-1 ml-6">
            {renderNavLinks(false)}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <ThemeSwitcher />
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
                onClick={async (event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  await supabase.auth.signOut();
                  router.refresh();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-3/4 sm:w-1/2 pt-10">
              <SheetHeader className="mb-6 text-left">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col space-y-2">
                {renderNavLinks(true)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
