// Ensure this file is treated as Server Actions
"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { PepiBook } from "@/types/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type FundRequest } from "@/types/schema";
import { CiPayment, Agent } from "@/types/schema";

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

  // Log the IDs just before inserting to compare with RLS check
  console.log(`[Server Action] Attempting insert for requestFundsAction.
    Logged-in User ID (auth.uid): ${user.id}
    Agent ID being inserted (agent_id): ${agentId}`
  );

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

// Action to delete a fund request
export async function deleteFundRequestAction(requestId: string) {
    "use server";
    console.log(`[Server Action] deleteFundRequestAction called for: ${requestId}`);
    const supabase = await createClient();

    // 1. Get current user and their agent details (ID and Role)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error("[Server Action] Authentication error during delete:", userError);
        return { error: "Authentication required." };
    }

    const { data: agentData, error: agentCheckError } = await supabase
        .from("agents")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

    if (agentCheckError || !agentData) {
        console.error(`[Server Action] Failed to find agent record for user ${user.id} during delete:`, agentCheckError);
        return { error: "Agent verification failed." };
    }
    console.log(`[Server Action] Delete initiated by Agent ID: ${agentData.id}, Role: ${agentData.role}`);

    // 2. Fetch the request to check ownership and status
    const { data: requestToDelete, error: fetchError } = await supabase
        .from("fund_requests")
        .select("id, agent_id, status")
        .eq("id", requestId)
        .single();

    if (fetchError || !requestToDelete) {
        console.error(`[Server Action] Fund request ${requestId} not found for deletion:`, fetchError);
        // Don't reveal if request exists or not for security, just say failed.
        return { error: "Could not delete request. It may have already been removed." }; 
    }

    // 3. Authorization Check
    let canDelete = false;
    if (agentData.role === 'admin') {
        canDelete = true; // Admins can delete any request
        console.log(`[Server Action] Admin deletion authorized for request ${requestId}.`);
    } else if (agentData.id === requestToDelete.agent_id) {
        // Agents can delete their own requests only if pending or rejected
        if (requestToDelete.status === 'pending' || requestToDelete.status === 'rejected') {
            canDelete = true;
            console.log(`[Server Action] Agent deletion authorized for own ${requestToDelete.status} request ${requestId}.`);
        } else {
            console.warn(`[Server Action] Agent ${agentData.id} denied deletion of own ${requestToDelete.status} request ${requestId}.`);
            return { error: "Cannot delete a request that has already been approved." };
        }
    } else {
        // Agent trying to delete someone else's request
        console.warn(`[Server Action] Agent ${agentData.id} denied deletion of request ${requestId} owned by ${requestToDelete.agent_id}.`);
        return { error: "You do not have permission to delete this request." };
    }

    if (!canDelete) {
         // Should not be reached due to checks above, but as a safeguard
         console.error(`[Server Action] Authorization failed unexpectedly for delete request ${requestId}.`);
         return { error: "Authorization failed." };
    }

    // 4. Perform Deletion
    console.log(`[Server Action] Performing deletion for request ${requestId}...`);
    const { error: deleteError, count: deleteCount } = await supabase // Capture count
        .from("fund_requests")
        .delete()
        .eq("id", requestId);

    if (deleteError) {
        console.error(`[Server Action] Error deleting fund request ${requestId}:`, deleteError);
        return { error: "Failed to delete fund request from database." };
    }

    // Log the count of deleted rows
    console.log(`[Server Action] Delete operation completed for ${requestId}. Rows affected: ${deleteCount}`);

    if (deleteCount === 0) {
        console.warn(`[Server Action] Delete operation for ${requestId} completed without error, but 0 rows were affected. RLS or timing issue?`);
        // Optionally return an error here if 0 affected rows is unexpected
        // return { error: "Delete operation completed but did not remove the request." };
    }

    console.log(`[Server Action] Successfully confirmed deletion of request ${requestId}.`); // Modified log message

    // 5. Revalidate paths
    revalidatePath("/dashboard");

    return { success: true };
}

// Define the schema for CI Payment form data using Zod
const ciPaymentSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  paying_agent_id: z.string().uuid().optional(), // Optional: Admin might select this
  amount_paid: z.number().positive({ message: "Amount must be positive" }),
  case_number: z.string().optional(),
  ci_signature: z.string().optional(), // Assuming base64 string or similar
  paid_to: z.string().optional(), // Add paid_to here as well
  paying_agent_signature: z.string().optional(),
  witness_signature: z.string().optional(),
  paying_agent_printed_name: z.string().min(1, { message: "Paying agent's printed name is required" }),
  witness_printed_name: z.string().optional(),
  pepi_receipt_number: z.string().optional(),
  book_id: z.string().uuid({ message: "Active PEPI Book ID is required" }) // Ensure book_id is provided
});

export type CiPaymentFormData = z.infer<typeof ciPaymentSchema>;

export async function createCiPaymentAction(formData: CiPaymentFormData): Promise<{ success: boolean; error?: string; data?: CiPayment }> {
  const supabase = await createClient();

  // 1. Get current user and role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("role, user_id")
    .eq("user_id", user.id)
    .single();

  if (agentError || !agentData) {
    console.error("Error fetching agent role:", agentError);
    return { success: false, error: "Could not verify agent role." };
  }

  const userRole = agentData.role;
  const loggedInUserId = agentData.user_id;

  // 2. Validate input data
  const validationResult = ciPaymentSchema.safeParse(formData);
  if (!validationResult.success) {
    console.error("CI Payment validation error:", validationResult.error.flatten());
    // Concatenate all error messages
    const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid form data: ${errorMessages}` };
  }

  const validatedData = validationResult.data;

  // 3. Determine Paying Agent ID (Revised Logic)
  let payingAgentId: string;
  if (userRole === 'admin') {
    // Admin can specify an agent, or defaults to themselves if none selected
    payingAgentId = validatedData.paying_agent_id || loggedInUserId;
    console.log(`[CI Payment Action] Admin user (${loggedInUserId}) submitting. Paying Agent ID set to: ${payingAgentId}`);
  } else {
    // Agent MUST submit for themselves.
    // Check if they tried to submit for someone else (paying_agent_id is present and different)
    if (validatedData.paying_agent_id && validatedData.paying_agent_id !== loggedInUserId) {
      console.warn(`[CI Payment Action] Agent user (${loggedInUserId}) attempt to submit for different agent (${validatedData.paying_agent_id}). Denying.`);
      return { success: false, error: "Agents can only submit payments for themselves." };
    }
    // Otherwise, agent is submitting for themselves (paying_agent_id is undefined or matches)
    payingAgentId = loggedInUserId;
     console.log(`[CI Payment Action] Agent user (${loggedInUserId}) submitting for self. Paying Agent ID set to: ${payingAgentId}`);
  }

  // 4. Generate Receipt Number (Example: CI-YYYYMMDD-HHMMSS-RANDOM)
  // Consider using a more robust method or sequence in production
  const now = new Date();
  const receiptNumber = `CI-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  // 5. Prepare data for insertion
  const paymentDataToInsert = {
    date: validatedData.date,
    paying_agent_id: payingAgentId,
    amount_paid: validatedData.amount_paid,
    case_number: validatedData.case_number,
    ci_signature: validatedData.ci_signature,
    paying_agent_signature: validatedData.paying_agent_signature,
    witness_signature: validatedData.witness_signature,
    paying_agent_printed_name: validatedData.paying_agent_printed_name,
    witness_printed_name: validatedData.witness_printed_name,
    receipt_number: receiptNumber,
    pepi_receipt_number: validatedData.pepi_receipt_number,
    status: 'pending', // Always pending initially
    book_id: validatedData.book_id, // Ensure this comes from the form/context
    // commander_signature, reviewed_by, reviewed_at, rejection_reason are null initially
  };

  // 6. Insert into database
  const { data: newPayment, error: insertError } = await supabase
    .from("ci_payments")
    .insert(paymentDataToInsert)
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting CI Payment:", insertError);
     // Check for specific errors like unique constraint violation for receipt_number
    if (insertError.code === '23505') { // Unique violation
        return { success: false, error: `Database error: Failed to generate a unique receipt number. Please try again. (${insertError.message})` };
    }
    return { success: false, error: `Database error: ${insertError.message}` };
  }

  // 7. Revalidate paths
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions"); // Assuming CI payments might appear here or trigger updates
  // Add specific path for admin approval list if different

  console.log("CI Payment created successfully:", newPayment);
  return { success: true, data: newPayment as CiPayment }; // Cast might be needed depending on type definition
}

// Action to fetch all agents for selection (e.g., in admin forms)
export async function getAgentsForSelectAction(): Promise<{ success: boolean; data?: { user_id: string; name: string }[]; error?: string }> {
  const supabase = await createClient();

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (adminCheckError || !adminData || adminData.role !== 'admin') {
    console.error("Admin check failed for getAgentsForSelectAction:", adminCheckError);
    return { success: false, error: "Admin privileges required." };
  }

  // Fetch agents
  const { data: agents, error } = await supabase
    .from("agents")
    .select("user_id, name")
    .order("name");

  if (error) {
    console.error("Error fetching agents for select:", error);
    return { success: false, error: "Failed to fetch agents." };
  }

  return { success: true, data: agents || [] };
}

// Action to fetch pending CI Payments for admin review
export async function getPendingCiPaymentsAction(bookId: string): Promise<{ success: boolean; data?: CiPayment[]; error?: string }> {
  const supabase = await createClient();

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (adminCheckError || !adminData || adminData.role !== 'admin') {
    console.error("Admin check failed for getPendingCiPaymentsAction:", adminCheckError);
    return { success: false, error: "Admin privileges required." };
  }

  if (!bookId) {
    return { success: false, error: "Active PEPI Book ID is required." };
  }

  // Fetch pending payments for the specified book, joining with agent name
  const { data: payments, error } = await supabase
    .from("ci_payments")
    .select(`
      *,
      paying_agent:agents!ci_payments_paying_agent_id_fkey(name)
    `)
    .eq("status", "pending")
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching pending CI Payments:", error);
    return { success: false, error: "Failed to fetch pending payments." };
  }

  // Explicitly cast to CiPayment[] ensuring paying_agent is handled
  const typedPayments = (payments || []).map(p => ({ ...p, paying_agent: p.paying_agent as Agent | null })) as CiPayment[];

  return { success: true, data: typedPayments };
}

// Action to approve a CI Payment
export async function approveCiPaymentAction(paymentId: string, commanderSignature: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (adminCheckError || !adminData || adminData.role !== 'admin') {
    console.error("Admin check failed for approveCiPaymentAction:", adminCheckError);
    return { success: false, error: "Admin privileges required." };
  }

  if (!paymentId || !commanderSignature) {
    return { success: false, error: "Payment ID and Commander Signature are required." };
  }

  // Fetch payment to ensure it's pending
  const { data: payment, error: fetchError } = await supabase
    .from("ci_payments")
    .select("status")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    console.error("Error fetching CI Payment for approval:", fetchError);
    return { success: false, error: "Payment not found." };
  }

  if (payment.status !== 'pending') {
    return { success: false, error: "Payment has already been processed." };
  }

  // Update payment status
  const { error: updateError } = await supabase
    .from("ci_payments")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      commander_signature: commanderSignature,
      rejection_reason: null // Clear any previous rejection reason if applicable (though shouldn't happen)
    })
    .eq("id", paymentId);

  if (updateError) {
    console.error("Error approving CI Payment:", updateError);
    return { success: false, error: "Failed to approve payment." };
  }

  // Revalidate relevant paths
  revalidatePath("/dashboard");
  // Add specific path for admin approval list

  console.log(`CI Payment ${paymentId} approved successfully.`);
  return { success: true };
}

// Action to reject a CI Payment
export async function rejectCiPaymentAction(paymentId: string, rejectionReason: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required." };

  const { data: adminData, error: adminCheckError } = await supabase
    .from("agents")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (adminCheckError || !adminData || adminData.role !== 'admin') {
    console.error("Admin check failed for rejectCiPaymentAction:", adminCheckError);
    return { success: false, error: "Admin privileges required." };
  }

  if (!paymentId || !rejectionReason) {
    return { success: false, error: "Payment ID and Rejection Reason are required." };
  }

  // Fetch payment to ensure it's pending
  const { data: payment, error: fetchError } = await supabase
    .from("ci_payments")
    .select("status")
    .eq("id", paymentId)
    .single();

  if (fetchError || !payment) {
    console.error("Error fetching CI Payment for rejection:", fetchError);
    return { success: false, error: "Payment not found." };
  }

  if (payment.status !== 'pending') {
    return { success: false, error: "Payment has already been processed." };
  }

  // Update payment status
  const { error: updateError } = await supabase
    .from("ci_payments")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
      commander_signature: null // Clear commander signature on rejection
    })
    .eq("id", paymentId);

  if (updateError) {
    console.error("Error rejecting CI Payment:", updateError);
    return { success: false, error: "Failed to reject payment." };
  }

  // Revalidate relevant paths
  revalidatePath("/dashboard");
  // Add specific path for admin approval list

  console.log(`CI Payment ${paymentId} rejected successfully.`);
  return { success: true };
}

// Action to fetch a specific CI Payment for printing (ensures it's approved)
export async function getCiPaymentForPrintAction(paymentId: string): Promise<{ success: boolean; data?: CiPayment; error?: string }> {
  console.log(`[getCiPaymentForPrintAction] Initiated for paymentId: ${paymentId}`); // Log start
  const supabase = await createClient();

  // 1. Verify user authentication (optional but good practice)
  const { data: { user }, error: authError } = await supabase.auth.getUser(); // Capture authError
  if (authError || !user) {
      console.error(`[getCiPaymentForPrintAction] Authentication error for paymentId ${paymentId}:`, authError);
      return { success: false, error: "Authentication required." };
  }
  console.log(`[getCiPaymentForPrintAction] User ${user.id} authenticated for paymentId: ${paymentId}`);

  // Admins or potentially the agent who submitted might view/print?
  // For now, let's assume authenticated users with access via RLS can fetch.
  // RLS policy should ensure only authorized users can see the data.

  if (!paymentId) {
    console.warn(`[getCiPaymentForPrintAction] No paymentId provided.`);
    return { success: false, error: "Payment ID is required." };
  }

  // 2. Fetch the payment details, including related agent/reviewer names
  console.log(`[getCiPaymentForPrintAction] Attempting to fetch payment details for ID: ${paymentId}`);
  const { data: payment, error: fetchError } = await supabase // Capture fetchError
    .from("ci_payments")
    .select(`
      *,
      paying_agent:agents!ci_payments_paying_agent_id_fkey(name, badge_number),
      reviewer:agents!ci_payments_reviewed_by_fkey(name)
    `)
    .eq("id", paymentId)
    // .eq("status", "approved") // Optional: Ensure only approved can be fetched here, or rely on RLS/calling context
    .single();

  if (fetchError) {
    console.error(`[getCiPaymentForPrintAction] Error fetching CI Payment ${paymentId} details:`, fetchError);
    return { success: false, error: `Failed to fetch CI Payment details. Code: ${fetchError.code}` }; // Include error code
  }

  if (!payment) {
     console.warn(`[getCiPaymentForPrintAction] CI Payment ${paymentId} not found.`);
     return { success: false, error: "CI Payment not found." };
  }
  console.log(`[getCiPaymentForPrintAction] Successfully fetched payment ${paymentId}. Status: ${payment.status}`);
  
  // Optional: Add explicit check for approved status if not done in query/RLS
  if (payment.status !== 'approved') {
      console.warn(`[getCiPaymentForPrintAction] Payment ${paymentId} is not approved (status: ${payment.status}).`);
      return { success: false, error: "This CI Payment has not been approved yet." };
  }

  // Cast nested objects to ensure type safety
  const typedPayment = {
      ...payment,
      paying_agent: payment.paying_agent as Agent | null,
      reviewer: payment.reviewer as Agent | null
  } as CiPayment;

  console.log(`[getCiPaymentForPrintAction] Returning success for paymentId: ${paymentId}`);
  return { success: true, data: typedPayment };
}

// Action to fetch approved CI Payments based on role and book
export async function getApprovedCiPaymentsAction(bookId: string): Promise<{ success: boolean; data?: CiPayment[]; error?: string }> {
  const supabase = await createClient();

  // 1. Verify user authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[getApprovedCiPaymentsAction] Authentication error:", userError);
    return { success: false, error: "Authentication required." };
  }

  if (!bookId) {
    console.warn("[getApprovedCiPaymentsAction] No activeBookId provided.");
    return { success: false, error: "Active PEPI Book ID is required." };
  }

  try {
    // 2. Fetch approved payments for the specified book
    // RLS policies will automatically filter based on the user's role (admin sees all, agent sees own)
    const { data: payments, error } = await supabase
      .from("ci_payments")
      .select(`
        *,
        paying_agent:agents!ci_payments_paying_agent_id_fkey(name),
        reviewer:agents!ci_payments_reviewed_by_fkey(name) 
      `)
      .eq("status", "approved")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false }); // Show most recent first

    if (error) {
      console.error("[getApprovedCiPaymentsAction] Error fetching approved CI Payments:", error);
      // Check for specific RLS errors if needed, though the policy should handle it
      if (error.code === '42501') { // RLS violation
           return { success: false, error: `Row Level Security prevented fetching payments. Ensure policies are correct. (${error.message})` };
      }
      return { success: false, error: `Failed to fetch approved payments: ${error.message}` };
    }

    // 3. Format and return data
    const typedPayments = (payments || []).map(p => ({
      ...p,
      paying_agent: p.paying_agent as Agent | null,
      reviewer: p.reviewer as Agent | null
    })) as CiPayment[];

    console.log(`[getApprovedCiPaymentsAction] Fetched ${typedPayments.length} approved payments for book ${bookId} for user ${user.id}`);
    return { success: true, data: typedPayments };

  } catch (err: any) {
     console.error("[getApprovedCiPaymentsAction] Unexpected error:", err);
     return { success: false, error: `An unexpected server error occurred: ${err.message}` };
  }
}

// Action to fetch CI payment history based on role (agent sees their own, admin sees all)
export async function getCiPaymentHistoryAction(bookId: string, agentId: string | null = null): Promise<{ success: boolean; data?: CiPayment[]; error?: string }> {
  const supabase = await createClient();

  // 1. Verify user authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("[getCiPaymentHistoryAction] Authentication error:", userError);
    return { success: false, error: "Authentication required." };
  }

  if (!bookId) {
    console.warn("[getCiPaymentHistoryAction] No book ID provided.");
    return { success: false, error: "PEPI Book ID is required." };
  }

  try {
    // Build query - if agentId is provided, filter by agent
    let query = supabase
      .from("ci_payments")
      .select(`
        *,
        paying_agent:agents!ci_payments_paying_agent_id_fkey(name, badge_number),
        reviewer:agents!ci_payments_reviewed_by_fkey(name)
      `)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    
    // If agent ID is provided (non-admin view), filter to only show their payments
    if (agentId) {
      query = query.eq("paying_agent_id", agentId);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error("[getCiPaymentHistoryAction] Error fetching CI Payments:", error);
      return { success: false, error: `Failed to fetch payments: ${error.message}` };
    }

    // Format and return data
    const typedPayments = (payments || []).map(p => ({
      ...p,
      paying_agent: p.paying_agent as Agent | null,
      reviewer: p.reviewer as Agent | null
    })) as CiPayment[];

    console.log(`[getCiPaymentHistoryAction] Fetched ${typedPayments.length} CI payments for book ${bookId}${agentId ? ` and agent ${agentId}` : ''}`);
    return { success: true, data: typedPayments };

  } catch (err: any) {
    console.error("[getCiPaymentHistoryAction] Unexpected error:", err);
    return { success: false, error: `An unexpected server error occurred: ${err.message}` };
  }
}

// Action to update user profile information
export async function updateUserProfileAction(data: {
  agentId: string;
  name: string;
  badge_number: string;
  // Add password fields if needed
}): Promise<{ success: boolean; error?: string }> {
  "use server";
  const supabase = await createClient();

  // 1. Verify user authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[updateUserProfileAction] Authentication error:", authError);
    return { success: false, error: "Authentication required." };
  }

  // 2. Verify the logged-in user matches the agent being updated
  const { data: agentData, error: agentCheckError } = await supabase
    .from("agents")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", data.agentId)
    .single();

  if (agentCheckError || !agentData) {
    console.error("[updateUserProfileAction] Agent verification failed:", agentCheckError);
    return { success: false, error: "Verification failed. You can only update your own profile." };
  }

  // 3. Update the agents table
  const { error: updateAgentError } = await supabase
    .from("agents")
    .update({
      name: data.name,
      badge_number: data.badge_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.agentId);

  if (updateAgentError) {
    console.error("[updateUserProfileAction] Error updating agents table:", updateAgentError);
    return { success: false, error: `Failed to update profile details: ${updateAgentError.message}` };
  }

  // Optional: Update auth.users metadata if needed (like name)
  // Be cautious with this, ensure data consistency
  const { error: updateAuthError } = await supabase.auth.updateUser({
      data: { full_name: data.name } // Make sure your auth schema supports this
  });

  if (updateAuthError) {
      console.warn("[updateUserProfileAction] Failed to update auth user metadata:", updateAuthError);
      // Don't necessarily fail the whole operation, but log it
  }

  // Optional: Handle password change logic here if implemented
  // This would involve verifying the current password and then calling supabase.auth.updateUser({ password: newPassword })

  console.log(`[updateUserProfileAction] Profile updated successfully for agent ${data.agentId}`);

  // Revalidate relevant paths
  revalidatePath("/dashboard/profile");
  // Revalidate navbar if it displays the user's name
  revalidatePath("/dashboard"); 

  return { success: true };
}

// Action to update an existing CI Payment
export async function updateCiPaymentAction(
  paymentId: string,
  formData: CiPaymentFormData // Use the same Zod schema type
): Promise<{ success: boolean; error?: string; data?: CiPayment }> {
  "use server";
  const supabase = await createClient();

  // 1. Get current user and role
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Authentication required." };
  }

  const { data: agentData, error: agentError } = await supabase
    .from("agents")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (agentError || !agentData) {
    console.error("[updateCiPaymentAction] Error fetching agent role:", agentError);
    return { success: false, error: "Could not verify agent role." };
  }

  const userRole = agentData.role;
  const loggedInAgentId = agentData.id;

  // 2. Fetch the existing payment to verify ownership and status (if needed)
  const { data: existingPayment, error: fetchError } = await supabase
    .from("ci_payments")
    .select("id, paying_agent_id, status")
    .eq("id", paymentId)
    .single();

  if (fetchError || !existingPayment) {
    console.error(`[updateCiPaymentAction] Failed to find payment ${paymentId} to update:`, fetchError);
    return { success: false, error: "CI Payment not found." };
  }

  // 3. Authorization Check
  if (userRole !== 'admin' && existingPayment.paying_agent_id !== loggedInAgentId) {
    console.warn(`[updateCiPaymentAction] Agent ${loggedInAgentId} attempted to update payment ${paymentId} owned by ${existingPayment.paying_agent_id}.`);
    return { success: false, error: "You do not have permission to edit this payment." };
  }

  // Optional: Add status check if edits are restricted (e.g., only pending/rejected)
  // if (existingPayment.status === 'approved' && userRole !== 'admin') {
  //   return { success: false, error: "Approved payments cannot be edited by agents." };
  // }

  // 4. Validate incoming data (already validated by form, but good practice)
  const validationResult = ciPaymentSchema.safeParse(formData);
  if (!validationResult.success) {
    console.error("[updateCiPaymentAction] Invalid data received:", validationResult.error.flatten());
    const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: `Invalid form data: ${errorMessages}` };
  }
  const validatedData = validationResult.data;

   // 5. Determine Paying Agent ID for update (Admin might change it)
   let payingAgentIdToUpdate: string;
   if (userRole === 'admin') {
       // Admin can specify an agent or it defaults to the logged-in admin if `paying_agent_id` is missing from form data
       payingAgentIdToUpdate = validatedData.paying_agent_id || loggedInAgentId;
   } else {
       // Agent cannot change the paying agent, it remains who originally submitted
       payingAgentIdToUpdate = existingPayment.paying_agent_id;
   }

  // 6. Prepare data for update (excluding fields that shouldn't change like receipt_number, created_at)
  const paymentDataToUpdate = {
    date: validatedData.date,
    paying_agent_id: payingAgentIdToUpdate, // Use determined ID
    amount_paid: validatedData.amount_paid,
    case_number: validatedData.case_number,
    paid_to: validatedData.paid_to,
    ci_signature: validatedData.ci_signature,
    paying_agent_signature: validatedData.paying_agent_signature,
    witness_signature: validatedData.witness_signature,
    paying_agent_printed_name: validatedData.paying_agent_printed_name,
    witness_printed_name: validatedData.witness_printed_name,
    pepi_receipt_number: validatedData.pepi_receipt_number,
    // IMPORTANT: If status needs to reset on edit (e.g., back to pending), add it here:
    // status: 'pending',
    // reviewed_by: null, // Clear approval fields if status resets
    // reviewed_at: null,
    // commander_signature: null,
    // rejection_reason: null, 
    updated_at: new Date().toISOString(),
  };

  // 7. Update in database
  const { data: updatedPayment, error: updateError } = await supabase
    .from("ci_payments")
    .update(paymentDataToUpdate)
    .eq("id", paymentId)
    .select()
    .single();

  if (updateError) {
    console.error(`[updateCiPaymentAction] Error updating CI Payment ${paymentId}:`, updateError);
    return { success: false, error: `Database error: ${updateError.message}` };
  }

  // 8. Revalidate paths
  revalidatePath("/dashboard/ci-history");
  revalidatePath("/dashboard"); 

  console.log(`[updateCiPaymentAction] CI Payment ${paymentId} updated successfully.`);
  return { success: true, data: updatedPayment as CiPayment };
}
