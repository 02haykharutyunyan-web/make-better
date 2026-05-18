import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { AdminCreatorRow, listAdminCreators } from "@/services/admin";
import { updateCreator } from "@/services/creators";
import { Star } from "lucide-react";

export default function AdminCreators() {
  const [creators, setCreators] = useState<AdminCreatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadCreators = async () => {
    setLoading(true);
    setErr("");
    try {
      setCreators(await listAdminCreators());
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to load creators."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreators();
  }, []);

  const toggleFeatured = async (creator: AdminCreatorRow) => {
    setErr("");
    try {
      const updated = await updateCreator(creator.id, { featured: !creator.featured });
      setCreators(prev => prev.map(c => c.id === creator.id ? { ...c, featured: updated.featured } : c));
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to update creator feature status."));
    }
  };

  return (
    <AdminLayout eyebrow="Creators" title="Creator management">
      {err && <div className="mb-6 rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-[#CFCFCF]">{err}</div>}
      {loading && <div className="mb-6 card-premium p-4 text-sm text-[#CFCFCF]">Loading creators...</div>}

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[#CFCFCF]/80">
              <tr>
                <th className="px-5 py-4">Creator</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Assets</th>
                <th className="px-5 py-4">Downloads</th>
                <th className="px-5 py-4">Joined</th>
                <th className="px-5 py-4">Featured</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creators.map(c => (
                <tr key={c.id} className="border-t border-white/5 align-top">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full border border-white/10 bg-[#0E0E0E]/70 flex items-center justify-center font-medium">
                        {c.brand_name.split(" ").map(w => w[0]).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-white inline-flex items-center gap-2">
                          {c.brand_name}
                          {c.featured && <Star className="h-3.5 w-3.5 fill-[#FFD600] text-[#FFD600]" />}
                        </div>
                        <div className="mt-1 text-xs text-[#CFCFCF]/80">{c.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-white/65">{c.email || "-"}</td>
                  <td className="px-5 py-4 text-white/65">{c.assetCount}</td>
                  <td className="px-5 py-4 text-white/65">{c.totalDownloads.toLocaleString()}</td>
                  <td className="px-5 py-4 text-[#CFCFCF]">{new Date(c.joinedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs ${c.featured ? "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20" : "bg-[#0E0E0E]/80 text-[#CFCFCF] border-white/10"}`}>
                      {c.featured ? "Featured" : "No"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-xs space-x-3 whitespace-nowrap">
                    <Link to={`/creator/${c.slug}`} className="text-[#CFCFCF] hover:text-white">View</Link>
                    <button onClick={() => toggleFeatured(c)} className="text-[#FFD600] hover:text-[#FFD600]">
                      {c.featured ? "Unfeature" : "Feature"}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && creators.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-[#CFCFCF]">No creators found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
