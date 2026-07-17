import { publicEnv } from "@/lib/env";

export function requireSupabaseConfig() {
  if (!publicEnv.hasSupabaseConfig) {
    throw new Error(`${publicEnv.supabaseConfigError || "Supabase is not configured."} Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.`);
  }
}

type SupabaseLikeError = Error & { code?: string; details?: string; hint?: string };

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return error instanceof Error;
}

function safePart(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/https?:\/\/\S+/g, "[url]").replace(/eyJ[a-zA-Z0-9._-]+/g, "[token]").slice(0, 500);
}

export function formatSupabaseOperationError(error: unknown, fallback = "Supabase request failed.", options?: { operation?: string; duplicateMessage?: string }) {
  if (!isSupabaseLikeError(error)) return new Error(fallback);
  const code = safePart(error.code);
  const details = safePart(error.details);
  const hint = safePart(error.hint);
  const message = safePart(error.message) || fallback;
  const friendly = options?.duplicateMessage && (code === "23505" || message.toLowerCase().includes("duplicate key")) ? options.duplicateMessage : message;
  const suffix = [code && `code: ${code}`, details && `details: ${details}`, hint && `hint: ${hint}`].filter(Boolean).join("; ");
  if (import.meta.env.DEV && options?.operation) console.warn(`[supabase:${options.operation}]`, { code, message, details, hint });
  return new Error(suffix ? `${friendly} (${suffix})` : friendly);
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

export function explainDeliverableError(error: unknown) {
  const message = explainSupabaseError(error, "The asset was created, but its private delivery could not be saved.");
  if (message.includes("Row Level Security")) {
    return "The asset was created, but Supabase blocked the private delivery save. Ask an admin to confirm the asset-deliverables RLS policies and storage bucket.";
  }
  if (message.includes("Storage is not ready")) {
    return "The asset was created, but the private delivery file could not be uploaded because Supabase Storage is not ready.";
  }
  if (message.includes("file is too large")) {
    return "The asset was created, but the delivery file is too large. Edit the asset and upload a file under 50 MB.";
  }
  return message;
}
