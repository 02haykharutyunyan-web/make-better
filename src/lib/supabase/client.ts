import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, requirePublicSupabaseConfig } from "@/lib/env";
import type { Database } from "@/types/database";

function createUnavailableSupabaseClient(): SupabaseClient<Database> {
  const fail = () => {
    requirePublicSupabaseConfig();
    throw new Error("Supabase is not configured.");
  };

  return new Proxy({}, {
    get() {
      fail();
    },
    apply() {
      fail();
    },
  }) as SupabaseClient<Database>;
}

export const supabase: SupabaseClient<Database> = publicEnv.hasSupabaseConfig
  ? createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createUnavailableSupabaseClient();

export function assertSupabaseConfig() {
  requirePublicSupabaseConfig();
}
