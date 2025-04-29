export type TransactionType = "issuance" | "spending" | "return";
export type TransactionStatus = "pending" | "approved" | "rejected";

export interface Transaction {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  receipt_number: string | null;
  description: string | null;
  agent_id: string | null;
  pepi_book_id: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  status: TransactionStatus;
  review_notes: string | null;
  transaction_date: string | null;
  spending_category?: string | null;
  case_number?: string | null;
  paid_to?: string | null;
  ecr_number?: string | null;
  date_to_evidence?: string | null;
  document_url?: string | null;
}

export interface TransactionWithAgent extends Transaction {
  agent: {
    id: string;
    name: string;
    badge_number: string | null;
  } | null;
}

export interface Agent {
  id: string;
  name: string;
  badge_number: string | null;
  email: string | null;
  phone: string | null;
  role: "agent" | "admin";
  user_id: string;
  created_at: string;
  updated_at: string | null;
}

export interface PepiBook {
  id: string;
  year: number;
  starting_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  current_balance: number | null;
}

export interface FundRequest {
  id: string;
  agent_id: string;
  amount: number;
  case_number: string | null;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  pepi_book_id: string | null;
}
