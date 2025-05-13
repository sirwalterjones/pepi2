import { createClient } from "../../supabase/server";
import { headers } from "next/headers";

export type AuditAction =
  | "login"
  | "logout"
  | "password_reset"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "email_sent"
  | "email_delivered"
  | "email_opened"
  | "email_clicked"
  | "email_bounced"
  | "email_complained";

export interface AuditLogEntry {
  user_id?: string;
  action: AuditAction | string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
}

export async function createAuditLog(entry: AuditLogEntry) {
  try {
    const supabase = await createClient();

    // Get IP address from headers
    const headersList = headers();
    const ip_address =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";

    // Insert audit log entry
    const { error } = await supabase.from("audit_logs").insert({
      user_id: entry.user_id,
      ip_address,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details || {},
    });

    if (error) {
      console.error("Error creating audit log:", error);
    }
  } catch (error) {
    console.error("Error in audit logging service:", error);
  }
}

export async function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  userId?: string;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
}) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("audit_logs")
      .select(
        `
        *,
        user:auth.users!audit_logs_user_id_fkey(email, user_metadata)
      `,
      )
      .order("timestamp", { ascending: false });

    // Apply filters if provided
    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }

    if (options?.action) {
      query = query.eq("action", options.action);
    }

    if (options?.entityType) {
      query = query.eq("entity_type", options.entityType);
    }

    if (options?.fromDate) {
      query = query.gte("timestamp", options.fromDate);
    }

    if (options?.toDate) {
      query = query.lte("timestamp", options.toDate);
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching audit logs:", error);
      return { data: [], error, count: 0 };
    }

    return { data, error: null, count };
  } catch (error) {
    console.error("Error in audit log retrieval service:", error);
    return { data: [], error, count: 0 };
  }
}
