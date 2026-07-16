type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  hasSupabaseConfig: boolean;
  supabaseConfigError: string | null;
};

function validateSupabaseConfig(url: string, anonKey: string): string | null {
  if (!url || !anonKey) return "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "VITE_SUPABASE_URL must be a valid HTTPS Supabase project URL.";
  }

  if (parsed.protocol !== "https:") return "VITE_SUPABASE_URL must use HTTPS.";
  if (!parsed.hostname.endsWith(".supabase.co") && !import.meta.env.DEV) {
    return "VITE_SUPABASE_URL must point to a Supabase project in production.";
  }
  if (anonKey.length < 20 || anonKey === "your-supabase-anon-key") {
    return "VITE_SUPABASE_ANON_KEY is not configured.";
  }

  return null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseConfigError = validateSupabaseConfig(supabaseUrl, supabaseAnonKey);

export const publicEnv: PublicEnv = {
  supabaseUrl,
  supabaseAnonKey,
  hasSupabaseConfig: !supabaseConfigError,
  supabaseConfigError,
};

export function requirePublicSupabaseConfig() {
  if (publicEnv.supabaseConfigError) {
    throw new Error(`${publicEnv.supabaseConfigError} Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the app.`);
  }
}
