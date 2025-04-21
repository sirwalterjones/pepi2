import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import {
  ArrowUpRight,
  CheckCircle2,
  Shield,
  DollarSign,
  FileText,
  Users,
} from "lucide-react";
import { createClient } from "../../supabase/server";

import { redirect } from "next/navigation";

export default async function Home() {
  // Redirect to sign-in page
  redirect("/sign-in");

  // The code below won't execute due to the redirect
  // but is kept for reference
  return null;
}
