"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  UserCircle,
  Home,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  CircleUser,
  Menu,
  Package2,
  Search,
  LogOut,
  List,
  BookOpen,
  Settings,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import SignOutButton from "@/components/sign-out-button";
import PepiBookSelector from "@/components/pepi-books/PepiBookSelector";
import { Agent } from "@/types/schema";

export default function DashboardNavbar() {
  const supabase = createClient();
  const pathname = usePathname();

  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: agentData, error } = await supabase
            .from('agents')
            .select('role')
            .eq('user_id', user.id)
            .single<Agent>();
    
          if (error && error.code !== 'PGRST116') {
            console.error("Error fetching agent role:", error);
          } else if (agentData) {
            setUserRole(agentData.role);
          }
        }
      } catch (err) {
        console.error("Error fetching user session or role:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [supabase]);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4" />, showFor: ["admin", "agent"] },
    { name: "Transactions", href: "/dashboard/transactions", icon: <List className="h-4 w-4" />, showFor: ["admin", "agent"] },
    { name: "Fund Requests", href: "/dashboard/requests", icon: <DollarSign className="h-4 w-4" />, showFor: ["admin", "agent"] },
    { name: "Agents", href: "/dashboard/agents", icon: <Users className="h-4 w-4" />, showFor: ["admin"] },
    { name: "Receipts", href: "/dashboard/receipts", icon: <FileText className="h-4 w-4" />, showFor: ["admin", "agent"] }, 
    { name: "PEPI Books", href: "/dashboard/pepi-books", icon: <BookOpen className="h-4 w-4" />, showFor: ["admin"] },
    //{ name: "Settings", href: "/dashboard/settings", icon: <Settings className="h-4 w-4" />, showFor: ["admin"] },
  ];

  const filteredNavItems = navItems.filter(item => userRole && item.showFor.includes(userRole));

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-lg font-semibold md:text-base"
        >
          <Package2 className="h-6 w-6" />
          <span className="sr-only">PEPI Inc</span>
        </Link>
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-muted-foreground transition-colors hover:text-foreground ${
                isActive ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Package2 className="h-6 w-6" />
              <span className="sr-only">PEPI Inc</span>
            </Link>
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-muted-foreground hover:text-foreground ${
                    isActive ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex-1 sm:flex-initial">
          <PepiBookSelector />
        </div>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/reset-password">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <SignOutButton />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
