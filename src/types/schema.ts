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

// Type definition for CI Payments based on the database table
export type CiPayment = {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  date: string; // date
  paying_agent_id: string; // uuid, FK to agents(user_id)
  amount_paid: number; // numeric(10, 2)
  case_number?: string | null; // text
  paid_to?: string | null; // text - Added Field
  ci_signature?: string | null; // text (base64 or path)
  paying_agent_signature?: string | null; // text (base64 or path)
  paying_agent_printed_name: string; // text
  witness_signature?: string | null; // text (base64 or path)
  witness_printed_name?: string | null; // text
  receipt_number?: string | null; // text, unique
  pepi_receipt_number?: string | null; // text
  status: 'pending' | 'approved' | 'rejected'; // text
  commander_signature?: string | null; // text (base64 or path)
  reviewed_by?: string | null; // uuid, FK to agents(user_id)
  reviewed_at?: string | null; // timestamp with time zone
  rejection_reason?: string | null; // text
  book_id: string; // uuid, FK to pepi_books(id)

  // Optional related data (if fetching with joins)
  paying_agent?: Agent | null;
  reviewer?: Agent | null;
  pepi_book?: PepiBook | null;
};
