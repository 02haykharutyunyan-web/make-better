import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { listProfiles, updateProfile } from "@/services/profiles";
import type { Tables, UserRole } from "@/types/database";

const roleBadge: Record<UserRole, string> = {
  buyer: "bg-[#0E0E0E]/80 text-white/80 border-white/10",
  creator: "bg-white/10 text-white border-white/20",
  admin: "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20",
};

function profileErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return message.toLowerCase().includes("row level security")
    ? "Supabase blocked profile access with Row Level Security. Confirm this account has role = admin in public.profiles and the admin profile read policy has been applied."
    : message;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const profiles = await listProfiles();
      setUsers(profiles);
    } catch (err) {
      setError(profileErrorMessage(err, "Unable to load users."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateUser = async (id: string, patch: { role?: UserRole; active?: boolean }) => {
    setSavingId(id);
    setError(null);
    try {
      const updated = await updateProfile(id, patch);
      setUsers(prev => prev.map(user => user.id === updated.id ? updated : user));
    } catch (err) {
      setError(profileErrorMessage(err, "Unable to update user."));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout eyebrow="Users" title="All users">
      {error && (
        <div className="mb-4 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-[#CFCFCF]">
          {error}
        </div>
      )}

      <div className="card-premium overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-sm text-[#CFCFCF]">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-sm text-[#CFCFCF]">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[#CFCFCF]/80">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-t border-white/5">
                    <td className="px-5 py-4 text-white">{user.full_name || "Unnamed user"}</td>
                    <td className="px-5 py-4 text-white/65">{user.email || "No email"}</td>
                    <td className="px-5 py-4">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={(event) => handleUpdateUser(user.id, { role: event.target.value as UserRole })}
                        className={`min-h-10 rounded-full border px-3 py-1 text-xs bg-transparent disabled:opacity-50 ${roleBadge[user.role]}`}
                      >
                        <option value="buyer" className="bg-black">buyer</option>
                        <option value="creator" className="bg-black">creator</option>
                        <option value="admin" className="bg-black">admin</option>
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-3 py-1 text-xs ${user.active ? "bg-[#FFD600]/10 text-[#FFD600] border-[#FFD600]/20" : "bg-white/10 text-[#CFCFCF] border-white/20"}`}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[#CFCFCF]">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        disabled={savingId === user.id}
                        onClick={() => handleUpdateUser(user.id, { active: !user.active })}
                        className="text-xs text-[#CFCFCF] hover:text-white disabled:opacity-50"
                      >
                        {user.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-white/5 px-5 py-3 text-xs text-[#CFCFCF]/70">
          Users are loaded from public.profiles. Auth account internals are not exposed to the frontend.
        </div>
      </div>
    </AdminLayout>
  );
}
