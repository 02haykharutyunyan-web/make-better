import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { explainSupabaseError } from "@/lib/supabase/errors";
import { listAdminAccessRequests, updateAccessRequestStatus } from "@/services/assets";
import type { AccessRequestStatus } from "@/types/database";

type AccessRequestRow = Awaited<ReturnType<typeof listAdminAccessRequests>>[number];

const statuses: AccessRequestStatus[] = ["new", "contacted", "closed"];

export default function AdminAccessRequests() {
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setErr("");
    try {
      setRequests(await listAdminAccessRequests());
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to load access requests."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const updateStatus = async (id: string, status: AccessRequestStatus) => {
    setErr("");
    try {
      await updateAccessRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to update request status."));
    }
  };

  return (
    <AdminLayout eyebrow="Requests" title="Access requests">
      {err && <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{err}</div>}
      {loading && <div className="mb-6 card-premium p-4 text-sm text-[#94A3B8]">Loading requests...</div>}

      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-[#94A3B8]/80">
              <tr>
                <th className="px-5 py-4">Asset</th>
                <th className="px-5 py-4">Buyer</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Requested</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="border-t border-white/5 align-top">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{r.assets?.title || "-"}</div>
                    <div className="mt-1 text-xs text-[#94A3B8]/80">{r.assets?.creators?.brand_name || ""}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-white/80">{r.buyer_name}</div>
                    <div className="mt-1 text-xs text-[#94A3B8]/80">{r.buyer_email}</div>
                  </td>
                  <td className="px-5 py-4 text-white/65">{r.buyer_phone || "-"}</td>
                  <td className="px-5 py-4 text-[#94A3B8]">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <select
                      value={r.status}
                      onChange={e => updateStatus(r.id, e.target.value as AccessRequestStatus)}
                      className="min-h-10 rounded-full border border-[#1E293B] bg-black px-3 py-1.5 text-xs text-white/80"
                    >
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#94A3B8]">No access requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
