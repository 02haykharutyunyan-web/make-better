import { supabase } from "@/lib/supabase/client";
import type { Inserts, Updates, UserRole } from "@/types/database";

export async function getCurrentUserProfile() {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertProfile(input: Inserts<"profiles">) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(id: string, patch: Updates<"profiles">) {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listProfiles(role?: UserRole) {
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
