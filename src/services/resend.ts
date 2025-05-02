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
    // Check if Resend API key is available
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not defined in environment variables");
      return { success: false, error: "Email service not configured" };
    }

    // Import Resend dynamically to avoid issues during build
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Set default from address if not provided
    const fromAddress =
      options.from || "PEPI Money Tracker <no-reply@pepitracker.gov>";

    // Send email using Resend
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
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Exception sending email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches an agent's email address from the database
 */
export async function getAgentEmail(agentId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("agents")
    .select("email")
    .eq("id", agentId)
    .single();

  if (error || !data) {
    console.error("Error fetching agent email:", error);
    return null;
  }

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
