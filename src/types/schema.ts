export type Agent = {
  id: string;
  user_id: string | null;
  name: string;
  badge_number: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  role: "admin" | "agent";
  created_at: string;
  updated_at: string | null;
};

export type TransactionType = "issuance" | "spending" | "return";

export type TransactionStatus = "pending" | "approved" | "rejected";

export type PepiBook = {
  id: string;
  year: number;
  starting_amount: number;
  current_balance?: number;
  is_active: boolean;
  is_closed: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
  closing_balance?: number;
};

export type Transaction = {
  id: string;
  transaction_type: TransactionType;
  amount: number;
  receipt_number: string | null;
  description: string | null;
  agent_id: string | null;
  pepi_book_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  status: TransactionStatus;
  review_notes: string | null;
};

export type FundRequest = {
  id: string;
  agent_id: string;
  pepi_book_id: string;
  amount: number;
  case_number: string | null;
  agent_signature: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  transaction_id: string | null;
  rejection_reason?: string | null;
};

export type AgentWithTransactions = Agent & {
  transactions: Transaction[];
};

export type TransactionWithAgent = Transaction & {
  agent: Agent | null;
  spending_category?: string | null;
  case_number?: string | null;
  paid_to?: string | null;
  ecr_number?: string | null;
  date_to_evidence?: string | null;
};

export type TransactionWithAgentAndBook = Transaction & {
  agent: Agent | null;
  pepi_book: PepiBook | null;
};

export type PepiBookWithTransactions = PepiBook & {
  transactions: Transaction[];
};
