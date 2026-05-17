import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Header from "@/components/layout/Header";
import { LayoutDashboard, Users, Sparkles, Package, BookOpen, FolderKanban, Inbox } from "lucide-react";

const nav = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/creators", label: "Creators", icon: Sparkles },
  { to: "/admin/assets", label: "Assets", icon: Package },
  { to: "/admin/requests", label: "Requests", icon: Inbox },
  { to: "/admin/blog", label: "Blog", icon: BookOpen },
  { to: "/admin/collections", label: "Collections", icon: FolderKanban },
];

export default function AdminLayout({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow?: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container-mb pt-10 pb-24 grid gap-10 lg:grid-cols-[220px_1fr] items-start">
        <aside className="lg:sticky lg:top-24">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40 px-3 mb-3">Admin</div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                    isActive ? "bg-white/[0.08] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`
                }
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="mt-3 text-3xl md:text-4xl font-medium tracking-[-0.03em]">{title}</h1>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
