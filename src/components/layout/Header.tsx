import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import { LogOut, Menu, User as UserIcon, X } from "lucide-react";

const baseLinks = [
  { to: "/assets", label: "Assets" },
  { to: "/collections", label: "Collections" },
  { to: "/creators", label: "Creators" },
  { to: "/blog", label: "Blog" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setAccountOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  const roleLinks = user?.role === "admin"
    ? [{ to: "/admin", label: "Admin" }]
    : user?.role === "creator"
    ? [{ to: "/creator-dashboard", label: "Dashboard" }]
    : user?.role === "buyer"
    ? [{ to: "/my-assets", label: "My Assets" }]
    : [];

  const navLinks = [...baseLinks, ...roleLinks];
  const signOut = async () => {
    await logout();
    navigate("/");
    setAccountOpen(false);
    setMobileOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-[#1E293B] bg-[#05070D]/82 shadow-[0_18px_60px_-42px_rgba(37,99,255,0.55)] backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="container-mb flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[#1E293B] bg-[#111827] shadow-[0_0_24px_rgba(37,99,255,0.18)]">
            <span className="text-[13px] font-semibold tracking-tight">M</span>
          </span>
          <span className="text-[15px] font-medium tracking-tight">
            Make Better<span className="text-[#94A3B8]/70">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-full transition-colors ${
                  isActive ? "bg-[#2563FF]/15 text-white shadow-[0_0_24px_rgba(37,99,255,0.12)]" : "text-[#94A3B8] hover:bg-[#F97316]/10 hover:text-white"
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
              <Link to="/login" className="hidden rounded-full px-3 py-1.5 text-sm text-[#94A3B8] transition hover:bg-[#F97316]/10 hover:text-white sm:inline-flex">
                Sign in
              </Link>
              <Link
                to="/creator-signup"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full btn-primary px-4 py-1.5 text-sm font-medium transition"
              >
                List your asset <span aria-hidden>→</span>
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setAccountOpen(o => !o)}
                className="hidden min-h-10 items-center gap-2 rounded-full border border-[#1E293B] bg-[#111827]/80 px-3 py-1.5 text-sm text-[#F8FAFC] transition hover:border-[#3B82F6]/60 hover:bg-[#2563FF]/15 sm:inline-flex"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{user.role}</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#1E293B] bg-[#0B1020] p-2 text-sm shadow-[0_24px_80px_-34px_rgba(37,99,255,0.7)]">
                  {roleLinks.map(l => (
                    <Link key={l.to} to={l.to} className="block px-3 py-2 rounded-xl hover:bg-[#F97316]/10">{l.label}</Link>
                  ))}
                  {user.role === "creator" && (
                    <Link to="/creator-dashboard/submit-asset" className="block px-3 py-2 rounded-xl hover:bg-[#F97316]/10">Submit asset</Link>
                  )}
                  <button
                    onClick={signOut}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F97316]/10 text-[#94A3B8] inline-flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(open => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1E293B] bg-[#111827]/80 text-white transition hover:border-[#F97316]/70 hover:bg-[#F97316]/10 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-[#05070D]/82 backdrop-blur-sm md:hidden transition-all duration-300 ${
          mobileOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-3"
        }`}
      >
        <div className="border-y border-[#1E293B] bg-[#0B1020]/96 shadow-[0_24px_90px_-38px_rgba(37,99,255,0.75)] backdrop-blur-2xl">
          <nav className="container-mb max-h-[calc(100dvh-4rem)] overflow-y-auto py-4">
            <div className="grid gap-1">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center justify-between rounded-2xl px-4 text-base transition ${
                      isActive ? "bg-[#2563FF]/16 text-white" : "text-[#94A3B8] hover:bg-[#F97316]/10 hover:text-white"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            <div className="mt-4 border-t border-[#1E293B] pt-4">
              {!user ? (
                <div className="grid gap-2">
                  <Link to="/login" className="btn-secondary flex min-h-12 items-center justify-center rounded-2xl text-sm font-medium">
                    Sign in
                  </Link>
                  <Link to="/creator-signup" className="btn-primary flex min-h-12 items-center justify-center rounded-2xl text-sm font-medium">
                    List your asset
                  </Link>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="rounded-2xl border border-[#1E293B] bg-[#111827]/80 px-4 py-3">
                    <div className="text-sm text-white">{user.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#94A3B8]/80">{user.role}</div>
                  </div>
                  {user.role === "creator" && (
                    <Link to="/creator-dashboard/submit-asset" className="btn-primary flex min-h-12 items-center justify-center rounded-2xl text-sm font-medium">
                      Submit asset
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#1E293B] bg-[#111827]/80 text-sm font-medium text-white/75"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
