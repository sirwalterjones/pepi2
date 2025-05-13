"use server";

import { createAuditLog } from "@/services/audit";

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Create audit log for sign-in
  if (data.user) {
    await createAuditLog({
      user_id: data.user.id,
      action: "login",
      details: { method: "password", email },
    });
  }

  return redirect("/dashboard");
};

export const signOutAction = async () => {
  const supabase = await createClient();

  // Get user before signing out
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create audit log for sign-out if user exists
  if (user) {
    await createAuditLog({
      user_id: user.id,
      action: "logout",
      details: { method: "server-action" },
    });
  }

  await supabase.auth.signOut();
  return redirect("/sign-in");
};
