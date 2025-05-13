"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePepiBooks } from "@/hooks/usePepiBooks";
import { PepiBook } from "@/types/schema";
import { Badge } from "@/components/ui/badge";
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

export default function DashboardNavbar() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const { activeBook, setActiveBook, availableBooks } = usePepiBooks();
  const [selectedBookId, setSelectedBookId] = useState("");

  useEffect(() => {
    async function getUserData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUser(user);

          // Get agent data including role
          const { data: agentData, error: agentError } = await supabase
            .from("agents")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (agentError) {
            console.error("Error fetching agent data:", agentError);
            return;
          }

          if (agentData) {
            setUserRole(agentData.role);
          }
        }
      } catch (error) {
        console.error("Error getting user data:", error);
      } finally {
        setLoading(false);
      }
    }

    getUserData();
  }, []);

  useEffect(() => {
    if (activeBook) {
      setSelectedBookId(activeBook.id);
    } else {
      setSelectedBookId("");
    }
  }, [activeBook]);

  const handleBookChange = async (bookId) => {
    if (!bookId) {
      setActiveBook(null);
      return;
    }

    const selectedBook = availableBooks.find((book) => book.id === bookId);
    if (selectedBook) {
      setActiveBook(selectedBook);

      // Store the selected book in local storage
      localStorage.setItem("activeBookId", bookId);
    }
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!userRole) return false;
    return item.showFor.includes(userRole);
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold">PEPI Tracker</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 transition-colors hover:text-foreground/80"
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {availableBooks && availableBooks.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <select
                value={selectedBookId}
                onChange={(e) => handleBookChange(e.target.value)}
                className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select PEPI Book</option>
                {availableBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.year} - {book.name}
                  </option>
                ))}
              </select>
              {activeBook && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Active: {activeBook.year}
                </Badge>
              )}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user?.user_metadata?.avatar_url || ""}
                    alt={user?.email || "User"}
                  />
                  <AvatarFallback>
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.user_metadata?.full_name || user?.email || "Account"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  // Log the sign-out event client-side
                  try {
                    await supabase.from("audit_logs").insert({
                      user_id: (await supabase.auth.getUser()).data.user?.id,
                      ip_address: "client-side",
                      action: "logout",
                      details: { method: "manual", component: "navbar" },
                    });
                  } catch (error) {
                    console.error("Error logging sign-out:", error);
                  }
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
    </header>
  );
}
