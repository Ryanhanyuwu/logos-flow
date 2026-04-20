"use server";

import { redirect } from "next/navigation";
import { createClient } from "~/lib/supabase/server";

const EMAIL_DOMAIN = "logosflow.app";

function toEmail(username: string) {
  return `${username.toLowerCase()}@${EMAIL_DOMAIN}`;
}

export async function signUp(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return {
      error: "Username must be 3–20 characters (letters, numbers, underscores)",
    };
  }
  if (!password || password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Username already taken" };
    }
    return { error: error.message };
  }

  redirect("/");
}

export async function signIn(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  const username = (formData.get("username") as string)?.trim();
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Account pending confirmation — disable email confirmation in Supabase or confirm your email",
      };
    }
    return { error: "Invalid username or password" };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
