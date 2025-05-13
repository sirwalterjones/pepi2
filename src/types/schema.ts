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

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  ip_address: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}
