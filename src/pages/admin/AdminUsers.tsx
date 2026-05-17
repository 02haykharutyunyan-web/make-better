import AdminLayout from "@/components/layout/AdminLayout";
import { Role, useStore } from "@/store/store";

const roleBadge: Record<Role, string> = {
  buyer: "bg-white/[0.06] text-white/80 border-white/10",
  creator: "bg-blue-400/10 text-blue-300 border-blue-400/20",
  admin: "bg-amber-400/10 text-amber-300 border-amber-400/20",
};

export default function AdminUsers() {
  const { store, updateUser } = useStore();

  return (
    <AdminLayout eyebrow="Users" title="All users">
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {store.users.map(u => (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-5 py-4 text-white">{u.name}</td>
                  <td className="px-5 py-4 text-white/65">{u.email}</td>
                  <td className="px-5 py-4 text-white/55">{u.phone || "—"}</td>
                  <td className="px-5 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                      className={`rounded-full border px-3 py-1 text-xs bg-transparent ${roleBadge[u.role]}`}
                    >
                      <option value="buyer" className="bg-black">buyer</option>
                      <option value="creator" className="bg-black">creator</option>
                      <option value="admin" className="bg-black">admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-white/55">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full border px-3 py-1 text-xs ${u.active ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20" : "bg-red-400/10 text-red-300 border-red-400/20"}`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => updateUser(u.id, { active: !u.active })}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
