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
      <div className="container-mb pt-6 sm:pt-10 pb-20 sm:pb-24 grid min-w-0 gap-6 sm:gap-10 lg:grid-cols-[220px_minmax(0,1fr)] items-start">
        <aside className="min-w-0 lg:sticky lg:top-24">
          <div className="mb-3 px-3 text-xs uppercase tracking-[0.18em] text-[#CFCFCF]">Admin</div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `inline-flex min-h-10 items-center gap-2 px-3 py-2 rounded-xl text-sm whitespace-nowrap transition ${
                    isActive ? "bg-[#FFD600]/16 text-white shadow-[0_0_24px_rgba(255,214,0,0.12)]" : "text-[#CFCFCF] hover:bg-[#FFD600]/10 hover:text-white"
                  }`
                }
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-medium tracking-normal leading-tight break-words">{title}</h1>
          <div className="mt-6 sm:mt-8 min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
