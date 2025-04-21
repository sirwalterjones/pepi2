"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { PepiBook } from "@/types/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type FundRequest } from "@/types/schema";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const supabase = await createClient();
  const origin = headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-in",
      "Email and password are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        email: email,
      },
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (user) {
    try {
      const { error: updateError } = await supabase.from("users").insert({
        id: user.id,
        name: fullName,
        full_name: fullName,
        email: email,
        user_id: user.id,
        token_identifier: user.id,
        created_at: new Date().toISOString(),
      });

      if (updateError) {
        console.error("Error updating user profile:", updateError);
      }
    } catch (err) {
      console.error("Error in user profile creation:", err);
    }
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Account created successfully. You can now sign in.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const createPepiBookAction = async (formData: FormData) => {
  const supabase = await createClient();
  const year = parseInt(formData.get("year") as string);
  const startingAmount = parseFloat(formData.get("startingAmount") as string);

  if (isNaN(year) || isNaN(startingAmount)) {
    return { success: false, error: "Invalid year or starting amount" };
  }

  try {
    // Check if a book for this year already exists
    const { data: existingBooks, error: checkError } = await supabase
      .from("pepi_books")
      .select("*")
      .eq("year", year);

    if (checkError) throw new Error(checkError.message);

    if (existingBooks && existingBooks.length > 0) {
      return {
        success: false,
        error: `A PEPI Book for ${year} already exists`,
      };
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to create a PEPI Book",
      };
    }

    // Check if there's already an active book
    const { data: activeBooks, error: activeError } = await supabase
      .from("pepi_books")
      .select("*")
      .eq("is_active", true);

    if (activeError) throw new Error(activeError.message);

    // Create the new PEPI Book
    const { data: newBook, error: createError } = await supabase
      .from("pepi_books")
      .insert({
        year: year,
        starting_amount: startingAmount,
        is_active: activeBooks && activeBooks.length === 0, // Only set as active if no other active books
        created_by: user.id,
      })
      .select();

    if (createError) throw new Error(createError.message);

    // If this is the first book, create an initial transaction for the starting amount
    if (newBook && newBook.length > 0) {
      const book = newBook[0] as PepiBook;

      // Only create a transaction if this book is active
      if (book.is_active) {
        const { error: transactionError } = await supabase
          .from("transactions")
          .insert({
            transaction_type: "issuance",
            amount: startingAmount,
            description: `Initial funding for ${year} PEPI Book`,
            pepi_book_id: book.id,
            created_by: user.id,
            receipt_number: `INIT-${year}-${Math.floor(Math.random() * 1000)
              .toString()
              .padStart(3, "0")}`,
          });

        if (transactionError) {
          console.error(
            "Error creating initial transaction:",
            transactionError,
          );
        }
      }
    }

    return {
      success: true,
      message: `PEPI Book for ${year} created successfully${activeBooks && activeBooks.length > 0 ? ", but it is not active because another book is currently active" : " and set as active"}`,
      book: newBook?.[0] || null,
    };
  } catch (error) {
    console.error("Error creating PEPI book:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create PEPI book",
    };
  }
};

export const closePepiBookAction = async (formData: FormData) => {
  const supabase = await createClient();
  const bookId = formData.get("bookId") as string;

  if (!bookId) {
    return { success: false, error: "Book ID is required" };
  }

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to close a PEPI Book",
      };
    }

    // Update the book to closed status
    const { data, error } = await supabase
      .from("pepi_books")
      .update({
        is_closed: true,
        is_active: false,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId)
      .select();

    if (error) throw new Error(error.message);

    return {
      success: true,
      message: "PEPI Book closed successfully",
      book: data?.[0] || null,
    };
  } catch (error) {
    console.error("Error closing PEPI book:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to close PEPI book",
    };
  }
};

export const addPepiBookFundsAction = async (formData: FormData) => {
  const supabase = await createClient();
  const bookId = formData.get("bookId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string;

  if (!bookId || isNaN(amount) || amount <= 0 || !description) {
    return {
      success: false,
      error: "Book ID, valid amount, and description are required",
    };
  }

  try {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to add funds to a PEPI Book",
      };
    }

    // Get the current book to check if it's active
    const { data: bookData, error: bookError } = await supabase
      .from("pepi_books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (bookError) throw new Error(bookError.message);

    if (!bookData) {
      return {
        success: false,
        error: "PEPI Book not found",
      };
    }

    if (!bookData.is_active) {
      return {
        success: false,
        error: "Cannot add funds to an inactive PEPI Book",
      };
    }

    if (bookData.is_closed) {
      return {
        success: false,
        error: "Cannot add funds to a closed PEPI Book",
      };
    }

    // Create a transaction for the added funds
    const receiptNumber = `ADD-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 10000,
    )
      .toString()
      .padStart(4, "0")}`;

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        transaction_type: "issuance",
        amount: amount,
        description: description,
        pepi_book_id: bookId,
        created_by: user.id,
        receipt_number: receiptNumber,
        status: "approved", // Auto-approve fund additions
      });

    if (transactionError) throw new Error(transactionError.message);

    return {
      success: true,
      message: `Successfully added ${amount.toFixed(2)} to the PEPI Book`,
      receiptNumber,
    };
  } catch (error) {
    console.error("Error adding funds to PEPI book:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to add funds to PEPI book",
    };
  }
};

// Validation schema for fund request data
const FundRequestSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  caseNumber: z.string().trim().optional().nullable(),
  agentSignature: z.string().trim().min(1, "Signature is required"),
  agentId: z.string().uuid("Invalid Agent ID"),
  pepiBookId: z.string().uuid("Invalid Pepi Book ID"),
});

export async function requestFundsAction(formData: {
  amount: number;
  caseNumber: string | null;
  agentSignature: string;
  agentId: string;
  pepiBookId: string;
}) {
  "use server";

  const supabase = await createClient();

  // 1. Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    return { error: "Authentication failed. Please log in again." };
  }

  // 2. Verify the agent submitting is the logged-in user
  const { data: agentData, error: agentCheckError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", formData.agentId)
    .single();

  if (agentCheckError || !agentData) {
    console.error("Agent verification failed:", agentCheckError);
    return { error: "Agent verification failed. You can only submit requests for yourself." };
  }

  // 3. Validate incoming data
  const validatedFields = FundRequestSchema.safeParse(formData);

  if (!validatedFields.success) {
    console.error("Fund request validation failed:", validatedFields.error.flatten().fieldErrors);
    // Safer way to get the first error message
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    // Ensure fieldErrors is not empty and get the first key
    const errorKeys = Object.keys(fieldErrors) as (keyof typeof fieldErrors)[];
    const firstErrorKey = errorKeys[0];
    // Get the message using the typed key
    const firstErrorMessage = firstErrorKey ? fieldErrors[firstErrorKey]?.[0] : undefined;
    return { error: firstErrorMessage || "Invalid data provided. Please check the form." };
  }

  const { amount, caseNumber, agentSignature, agentId, pepiBookId } = validatedFields.data;

  // 4. Insert into fund_requests table
  try {
    const { error: insertError } = await supabase
      .from("fund_requests")
      .insert({
        agent_id: agentId,
        pepi_book_id: pepiBookId,
        amount: amount,
        case_number: caseNumber,
        agent_signature: agentSignature,
        // status defaults to 'pending'
        // requested_at defaults to now()
      });

    if (insertError) {
      console.error("Error inserting fund request:", insertError);
      throw new Error("Database error: Could not save fund request.");
    }

    // 5. Revalidate relevant paths (e.g., where requests are listed)
    revalidatePath("/dashboard"); // Revalidate agent dashboard
    // TODO: Add path for admin view if different

    return { success: true };

  } catch (error: any) {
    console.error("Fund request submission failed:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

// Action to approve a fund request
export async function approveFundRequestAction(requestId: string) {
  "use server";
  // Log invocation immediately
  console.log(`[Server Action] approveFundRequestAction INVOKED with requestId: ${requestId}`);

  try {
    // Original logic starts here
    const supabase = await createClient();

    // 1. Verify user is admin
    console.log(`[Server Action] Attempting to get user...`);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("[Server Action] Authentication error:", userError);
      return { error: "Authentication required." };
    }
    console.log(`[Server Action] Authenticated User ID: ${user.id}`);

    console.log(`[Server Action] Attempting to fetch agent data for user ${user.id}...`);
    const { data: agentData, error: adminCheckError } = await supabase
      .from("agents")
      .select("id, name, role") // Select role
      .eq("user_id", user.id)
      .single();

    if (adminCheckError || !agentData) {
      console.error(`[Server Action] Error fetching agent data for user ${user.id}:`, adminCheckError);
      // Provide more specific feedback if possible
      if (adminCheckError?.code === 'PGRST116') { // Code for 'No rows found'
         return { error: `No agent record found linked to user ID ${user.id}. Cannot verify role.` };
      }
      return { error: "Failed to retrieve agent data." };
    }
    console.log(`[Server Action] User's Agent Role: ${agentData.role}`);

    if (agentData.role !== 'admin') {
       console.warn(`[Server Action] User ${user.id} with role ${agentData.role} attempted admin action.`);
       return { error: "Admin privileges required." };
    }

    // 2. Fetch the fund request details
    console.log(`[Server Action] Attempting to fetch fund request with ID: ${requestId}`);
    const { data: request, error: fetchError } = await supabase
      .from("fund_requests")
      .select(`
        *,
        pepi_book:pepi_books!fund_requests_pepi_book_id_fkey(is_active, is_closed),
        agent:agents!fund_requests_agent_id_fkey(name)
      `)
      .eq("id", requestId)
      .single();

    if (fetchError || !request) {
      console.error(`[Server Action] Error fetching fund request ${requestId}:`, fetchError);
      return { error: `Fund request not found (ID: ${requestId.substring(0,8)}...). Supabase error: ${fetchError?.message}` };
    }
    console.log(`[Server Action] Found fund request ${requestId}. Status: ${request.status}`);

    if (request.status !== 'pending') {
      console.warn(`[Server Action] Request ${requestId} already processed. Status: ${request.status}`);
      return { error: "Request has already been processed." };
    }

    if (!request.pepi_book?.is_active || request.pepi_book?.is_closed) {
      console.warn(`[Server Action] Request ${requestId} belongs to inactive/closed PEPI Book.`);
      return { error: "Cannot process request for an inactive or closed PEPI Book." };
    }

    // Inline formatters (or use global ones if available)
    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

    // 3. Create the corresponding transaction with a detailed description
    console.log(`[Server Action] Creating transaction for request ${requestId}...`);
    const transactionDescription = 
      `Approved fund request for ${request.agent?.name || request.agent_id} ` +
      `(Case: ${request.case_number || 'N/A'}). ` +
      `Amount: ${formatCurrency(request.amount)}. ` +
      `Requested: ${formatDate(request.requested_at)}. ` +
      `Approved by: ${agentData.name || user.email}. ` +
      `Agent Signature on Request: ${request.agent_signature || 'N/A'}`;

    const { data: newTransaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        agent_id: request.agent_id,
        pepi_book_id: request.pepi_book_id,
        transaction_type: "issuance",
        amount: request.amount,
        description: transactionDescription,
        created_by: user.id, // Admin user ID
        status: "approved", // Auto-approved issuance
        receipt_number: `REQ-${requestId.substring(0, 8)}`, // Generate a receipt number
      })
      .select('id') // Select the ID of the newly created transaction
      .single();

    if (transactionError || !newTransaction) {
      console.error(`[Server Action] Error creating transaction for fund request ${requestId}:`, transactionError);
      return { error: "Failed to create associated transaction." };
    }
    console.log(`[Server Action] Created transaction ${newTransaction.id} for request ${requestId}.`);

    // 4. Update the fund request status
    console.log(`[Server Action] Updating status for request ${requestId} to approved...`);
    const { error: updateError } = await supabase
      .from("fund_requests")
      .update({
        status: "approved",
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
        transaction_id: newTransaction.id, // Link to the created transaction
      })
      .eq("id", requestId);

    if (updateError) {
      console.error(`[Server Action] CRITICAL: Failed to update fund request ${requestId} status after creating transaction ${newTransaction.id}:`, updateError);
      // TODO: Consider trying to delete the created transaction here if possible
      return { error: "Failed to update request status after approval." };
    }
    console.log(`[Server Action] Successfully updated status for request ${requestId}.`);

    // 5. Revalidate paths
    console.log(`[Server Action] Revalidating /dashboard path...`);
    revalidatePath("/dashboard");

    console.log(`[Server Action] approveFundRequestAction COMPLETED successfully for requestId: ${requestId}`);
    return { success: true };

  } catch (error: any) {
    // Catch any unexpected errors in the entire block
    console.error(`[Server Action] UNHANDLED ERROR in approveFundRequestAction for requestId: ${requestId}:`, error);
    return { error: `An unexpected server error occurred: ${error.message}` };
  }
}

// Action to reject a fund request
export async function rejectFundRequestAction(requestId: string, reason?: string | null) {
  "use server";
  console.log(`[Server Action] rejectFundRequestAction called for ${requestId} with reason: ${reason}`);
  const supabase = await createClient();

  // 1. Verify user is admin
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[Server Action] Authentication error:", userError);
    return { error: "Authentication required." };
  }
  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (adminCheckError || !adminData) {
     console.warn(`[Server Action] User ${user.id} without admin privileges attempted reject action.`);
     return { error: "Admin privileges required." };
  }

  // 2. Fetch the fund request to ensure it's pending
  const { data: request, error: fetchError } = await supabase
    .from("fund_requests")
    .select("status")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    console.error(`[Server Action] Fund request ${requestId} not found for rejection:`, fetchError);
    return { error: "Fund request not found." };
  }

  if (request.status !== 'pending') {
    console.warn(`[Server Action] Fund request ${requestId} already processed (status: ${request.status}). Cannot reject.`);
    return { error: "Request has already been processed." };
  }

  // 3. Update the fund request status and add rejection reason
  console.log(`[Server Action] Updating request ${requestId} to rejected with reason: ${reason}`);
  const { error: updateError } = await supabase
    .from("fund_requests")
    .update({
      status: "rejected",
      reviewed_by_user_id: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason || null,
    })
    .eq("id", requestId);

  if (updateError) {
    console.error(`[Server Action] Error rejecting fund request ${requestId}:`, updateError);
    return { error: "Failed to update request status." };
  }
  console.log(`[Server Action] Successfully rejected request ${requestId}.`);

  // 4. Revalidate paths
  revalidatePath("/dashboard");

  return { success: true };
}

// Action to resubmit an edited fund request
export async function resubmitFundRequestAction(formData: {
    requestId: string; // ID of the request being edited
    amount: number;
    caseNumber: string | null;
    agentSignature: string; 
}) {
    "use server";
    console.log("[Server Action] resubmitFundRequestAction called for:", formData.requestId);
    const supabase = await createClient();

    // 1. Get current user and verify they are the agent who owns the request
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error("[Server Action] Authentication error during resubmit:", userError);
        return { error: "Authentication required." };
    }

    const { data: agentData, error: agentCheckError } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (agentCheckError || !agentData) {
        console.error(`[Server Action] Failed to find agent record for user ${user.id} during resubmit:`, agentCheckError);
        return { error: "Agent verification failed." };
    }

    // 2. Fetch the existing request to verify ownership and status ('rejected')
    const { data: existingRequest, error: fetchError } = await supabase
        .from("fund_requests")
        .select("id, agent_id, status")
        .eq("id", formData.requestId)
        .single();

    if (fetchError || !existingRequest) {
        console.error(`[Server Action] Failed to find rejected request ${formData.requestId} for resubmit:`, fetchError);
        return { error: "Original rejected request not found." };
    }

    if (existingRequest.agent_id !== agentData.id) {
        console.warn(`[Server Action] Agent ${agentData.id} attempted to resubmit request ${formData.requestId} owned by ${existingRequest.agent_id}.`);
        return { error: "You can only resubmit your own rejected requests." };
    }

    if (existingRequest.status !== 'rejected') {
        console.warn(`[Server Action] Attempted to resubmit request ${formData.requestId} which is not rejected (status: ${existingRequest.status}).`);
        return { error: "Only rejected requests can be resubmitted." };
    }

    // 3. Update the request
    const { error: updateError } = await supabase
        .from("fund_requests")
        .update({
            amount: formData.amount,
            case_number: formData.caseNumber,
            agent_signature: formData.agentSignature,
            status: 'pending', // Set status back to pending
            rejection_reason: null, // Clear rejection reason
            reviewed_by_user_id: null, // Clear reviewer fields
            reviewed_at: null,
            transaction_id: null, // Clear linked transaction (shouldn't exist anyway)
            requested_at: new Date().toISOString(), // Update timestamp to reflect resubmission time
        })
        .eq("id", formData.requestId);

    if (updateError) {
        console.error(`[Server Action] Error updating fund request ${formData.requestId} on resubmit:`, updateError);
        return { error: "Failed to resubmit fund request." };
    }
    
    console.log(`[Server Action] Successfully resubmitted request ${formData.requestId}`);

    // 4. Revalidate paths
    revalidatePath("/dashboard");

    return { success: true };
}
