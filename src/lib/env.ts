type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  hasSupabaseConfig: boolean;
};

export const publicEnv: PublicEnv = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  hasSupabaseConfig: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
};
