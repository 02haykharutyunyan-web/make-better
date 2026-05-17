import { publicEnv } from "@/lib/env";

export function requireSupabaseConfig() {
  if (!publicEnv.hasSupabaseConfig) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the dev server.");
  }
}

export function explainSupabaseError(error: unknown, fallback = "Supabase request failed.") {
  if (!(error instanceof Error)) return fallback;

  const message = error.message;
  const lower = message.toLowerCase();

  if (lower.includes("failed to fetch") || lower.includes("invalid api key") || lower.includes("supabase is not configured")) {
    return "Supabase connection failed. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.";
  }

  if (lower.includes("row-level security") || lower.includes("permission denied") || lower.includes("not authorized")) {
    return "Supabase blocked this action with Row Level Security. Check that your profile role and RLS policies allow this operation.";
  }

  if (lower.includes("bucket not found") || lower.includes("storage bucket") || lower.includes("asset-deliverables")) {
    return "Supabase Storage is not ready. Run the Phase 3 migration and confirm the private asset-deliverables bucket exists.";
  }

  if (lower.includes("payload too large") || lower.includes("file size")) {
    return "Upload failed because the file is too large. Use a file under 50 MB.";
  }

  if (lower.includes("user already registered")) {
    return "An account already exists for this email. Sign in instead.";
  }

  if (lower.includes("email not confirmed")) {
    return "Confirm your email in Supabase Auth, then sign in again.";
  }

  return message || fallback;
}
