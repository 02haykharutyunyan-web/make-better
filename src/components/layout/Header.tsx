import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import { LogOut, User as UserIcon } from "lucide-react";

const baseLinks = [
  { to: "/assets", label: "Assets" },
  { to: "/collections", label: "Collections" },
  { to: "/creators", label: "Creators" },
  { to: "/blog", label: "Blog" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }); setMenuOpen(false); }, [location.pathname]);

  const roleLinks = user?.role === "admin"
    ? [{ to: "/admin", label: "Admin" }]
    : user?.role === "creator"
    ? [{ to: "/creator-dashboard", label: "Dashboard" }]
    : user?.role === "buyer"
    ? [{ to: "/my-assets", label: "My Assets" }]
    : [];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-xl bg-background/70 border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="container-mb flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04]">
            <span className="text-[13px] font-semibold tracking-tight">M</span>
          </span>
          <span className="text-[15px] font-medium tracking-tight">
            Make Better<span className="text-white/40">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[...baseLinks, ...roleLinks].map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-full transition-colors ${
                  isActive ? "text-white bg-white/[0.06]" : "text-white/60 hover:text-white"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/login" className="hidden sm:inline-flex text-sm text-white/70 hover:text-white px-3 py-1.5">
                Sign in
              </Link>
              <Link
                to="/creator-signup"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white text-black px-4 py-1.5 text-sm font-medium hover:bg-white/90 transition"
              >
                List your asset <span aria-hidden>→</span>
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm hover:bg-white/[0.08]"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/50">{user.role}</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl p-2 text-sm">
                  {roleLinks.map(l => (
                    <Link key={l.to} to={l.to} className="block px-3 py-2 rounded-xl hover:bg-white/[0.06]">{l.label}</Link>
                  ))}
                  {user.role === "creator" && (
                    <Link to="/creator-dashboard/submit-asset" className="block px-3 py-2 rounded-xl hover:bg-white/[0.06]">Submit asset</Link>
                  )}
                  <button
                    onClick={() => { logout(); navigate("/"); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/[0.06] text-white/70 inline-flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
