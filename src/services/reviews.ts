import { supabase } from "@/lib/supabase/client";
import type { Inserts, Updates } from "@/types/database";

export async function listAssetReviews(assetId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles (id, full_name)")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertReview(input: Inserts<"reviews">) {
  const { data, error } = await supabase
    .from("reviews")
    .upsert(input, { onConflict: "user_id,asset_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReview(id: string, patch: Updates<"reviews">) {
  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
