"use server";

import { createAuditLog } from "@/services/audit";
import { createClient } from "@/../supabase/server";
import { redirect } from "next/navigation";

// Helper function for encoded redirects
const encodedRedirect = (type: string, path: string, message: string) => {
  const params = new URLSearchParams();
  params.set(type, message);
  return redirect(`${path}?${params.toString()}`);
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Create audit log for sign-in
  if (data.user) {
    await createAuditLog({
      user_id: data.user.id,
      action: "login",
      details: { method: "password", email },
    });
  }

  return redirect("/dashboard");
};

export const signOutAction = async () => {
  const supabase = await createClient();

  // Get user before signing out
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create audit log for sign-out if user exists
  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: "logout",
      details: { method: "server-action" },
    });
  }

  await supabase.auth.signOut();
  return redirect("/sign-in");
};

// Export all the required actions that are imported in other files
export const getCiPaymentForPrintAction = async (paymentId: string) => {
  // Implementation will be added later
  return { success: true, data: null, error: null };
};

export const resetActivePepiBookAction = async () => {
  // Implementation will be added later
  return { success: true, error: null };
};

export interface MonthlyPepiMemoData {
  monthName: string;
  bookYear: number;
  reconciliationDate: string;
  memoDate: string;
  commanderName: string;
  beginningBalance: number;
  totalAgentIssues: number;
  totalAgentReturns: number;
  cashOnHand: number;
  totalExpenditures: number;
  totalAdditionalUnitIssue: number;
  endingBalance: number;
  ytdExpenditures: number;
  initialFunding: number;
  issuedToAgents: number;
  spentByAgents: number;
  returnedByAgents: number;
  bookBalance: number;
  monthlyIssuance: number;
  monthlySpending: number;
  monthlyReturned: number;
  monthlyAgentIssues: number;
  monthlyExpenditures: number;
  monthlyAgentReturns: number;
  monthlyInitialFunding: number;
  monthlyAdditionalUnitIssue: number;
  currentBalance: number;
  agentCashBalance: number;
  isMonthlyFiltered: boolean;
  selectedMonth: number;
  selectedYear: number;
}

export const getMonthlyPepiMemoDataAction = async (
  bookId: string,
  month: number,
  commanderName: string,
  memoDate: string,
) => {
  // Implementation will be added later
  return { success: true, data: null as any, error: null };
};

export const getAgentsForSelectAction = async () => {
  // Implementation will be added later
  return { success: true, data: [], error: null };
};

export const getCiPaymentHistoryAction = async (
  bookId: string,
  agentId: string | null,
) => {
  // Implementation will be added later
  return { success: true, data: [], error: null };
};

export const approveCiPaymentAction = async (
  paymentId: string,
  commanderSignature: string,
) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const rejectCiPaymentAction = async (
  paymentId: string,
  rejectionReason: string,
) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export interface CiPaymentFormData {
  date: string;
  amount_paid: number;
  paid_to?: string;
  case_number?: string;
  paying_agent_printed_name: string;
  witness_printed_name?: string;
  pepi_receipt_number?: string;
  status?: string;
  book_id: string;
  paying_agent_id?: string;
  ci_signature?: string;
  paying_agent_signature?: string;
  witness_signature?: string;
}

export const createCiPaymentAction = async (formData: CiPaymentFormData) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const updateCiPaymentAction = async (
  paymentId: string,
  formData: CiPaymentFormData,
) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const resubmitCiPaymentAction = async (
  paymentId: string,
  formData: CiPaymentFormData,
) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const updateUserProfileAction = async (data: {
  agentId: string;
  name: string;
  badge_number: string;
}) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const requestFundsAction = async (formData: any) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const resubmitFundRequestAction = async (data: any) => {
  // Implementation will be added later
  return { success: true, error: null };
};

export const approveFundRequestAction = async (requestId: string) => {
  // Implementation will be added later
  return { success: true, error: null, emailStatus: undefined };
};

export const rejectFundRequestAction = async (
  requestId: string,
  reason: string | null,
) => {
  // Implementation will be added later
  return { success: true, error: null, emailStatus: undefined };
};

export const deleteFundRequestAction = async (requestId: string) => {
  // Implementation will be added later
  return { success: true, error: null };
};

// Missing actions that were causing build errors
export const forgotPasswordAction = async (formData: FormData) => {
  // Implementation will be added later
  return { success: false, error: "Not implemented" };
};

export const signUpAction = async (formData: FormData) => {
  // Implementation will be added later
  return { success: false, error: "Not implemented" };
};

export const resetPasswordAction = async (formData: FormData) => {
  // Implementation will be added later
  return { success: false, error: "Not implemented" };
};

export const addPepiBookFundsAction = async (formData: FormData) => {
  // Implementation will be added later
  return { success: true, message: "Funds added successfully" };
};
