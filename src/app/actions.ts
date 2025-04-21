"use server";

import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../../supabase/server";
import { PepiBook } from "@/types/schema";

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
