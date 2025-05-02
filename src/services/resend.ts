import { createClient } from "../../supabase/server";

type EmailOptions = {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
};

export async function sendEmail(options: EmailOptions) {
  try {
    console.log("[EMAIL] sendEmail called with options:", {
      to: options.to,
      subject: options.subject,
      from: options.from || "default",
      hasReact: !!options.react,
      tags: options.tags,
    });

    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error(
        "[EMAIL] RESEND_API_KEY is not defined in environment variables",
      );
      return {
        success: false,
        error: "Email service not configured",
        toastMessage:
          "Email service not configured. Please check environment variables.",
      };
    }

    // Import Resend dynamically to avoid issues during build
    console.log("[EMAIL] Importing Resend library...");
    const { Resend } = await import("resend");

    // Log the API key length (safely) to verify it's present
    const apiKey = process.env.RESEND_API_KEY;
    console.log(
      `[EMAIL] RESEND_API_KEY length: ${apiKey ? apiKey.length : 0}, first 4 chars: ${apiKey ? apiKey.substring(0, 4) : "none"}`,
    );

    const resend = new Resend(apiKey);
    console.log("[EMAIL] Resend client initialized");

    // Set default from address if not provided
    const fromAddress =
      options.from || "PEPI Money Tracker <no-reply@pepitracker.gov>";

    console.log(
      `[EMAIL] Sending email to ${Array.isArray(options.to) ? options.to.join(", ") : options.to} with subject "${options.subject}"`,
    );

    // Validate email address format
    const validateEmail = (email: string) => {
      return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    };

    // Check recipient email format
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const invalidEmails = recipients.filter((email) => !validateEmail(email));
    if (invalidEmails.length > 0) {
      console.error(`[EMAIL] Invalid email format detected:`, invalidEmails);
      return {
        success: false,
        error: `Invalid email format: ${invalidEmails.join(", ")}`,
        toastMessage: `Invalid email format: ${invalidEmails.join(", ")}`,
      };
    }

    // Send email using Resend
    console.log(
      `[EMAIL] Calling resend.emails.send with fromAddress: ${fromAddress}`,
    );
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      react: options.react,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      attachments: options.attachments,
      tags: options.tags,
    });

    if (error) {
      console.error("[EMAIL] Error sending email:", error);
      return {
        success: false,
        error: error.message,
        toastMessage: `Failed to send email: ${error.message}`,
      };
    }

    console.log("[EMAIL] Email sent successfully:", data);
    return {
      success: true,
      data,
      toastMessage: "Email notification sent successfully",
    };
  } catch (error: any) {
    console.error("[EMAIL] Exception sending email:", error);
    console.error("[EMAIL] Error stack:", error?.stack || "No stack trace");
    return {
      success: false,
      error: error.message,
      toastMessage: `Error sending email: ${error.message}`,
    };
  }
}

/**
 * Fetches an agent's email address from the database
 */
export async function getAgentEmail(agentId: string): Promise<string | null> {
  console.log(`[EMAIL] getAgentEmail called for agent ID: ${agentId}`);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agents")
    .select("email, name")
    .eq("id", agentId)
    .single();

  if (error) {
    console.error(
      `[EMAIL] Error fetching agent email for ID ${agentId}:`,
      error,
    );
    return null;
  }

  if (!data) {
    console.error(`[EMAIL] No agent found with ID ${agentId}`);
    return null;
  }

  if (!data.email) {
    console.error(
      `[EMAIL] Agent ${data.name || agentId} has no email address configured`,
    );
    return null;
  }

  console.log(
    `[EMAIL] Successfully retrieved email for agent ${agentId}: ${data.email}`,
  );
  return data.email;
}

/**
 * Fetches all admin emails from the database
 */
export async function getAdminEmails(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agents")
    .select("email")
    .eq("role", "admin")
    .not("email", "is", null);

  if (error || !data) {
    console.error("Error fetching admin emails:", error);
    return [];
  }

  return data.map((admin) => admin.email as string).filter(Boolean);
}
