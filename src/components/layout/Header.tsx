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
        scrolled ? "glass-nav" : "bg-transparent"
      }`}
    >
      <div className="container-mb flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0E0E0E] shadow-[0_0_24px_rgba(255,214,0,0.18)]">
            <span className="text-[13px] font-semibold tracking-normal">M</span>
          </span>
          <span className="text-[15px] font-medium tracking-normal">
            Make Better<span className="text-[#CFCFCF]/70">.</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-1.5 text-sm rounded-full transition-colors ${
                  isActive ? "bg-[#FFD600]/15 text-white shadow-[0_0_24px_rgba(255,214,0,0.12)]" : "text-[#CFCFCF] hover:bg-[#FFD600]/10 hover:text-white"
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
              <Link to="/login" className="hidden rounded-full px-3 py-1.5 text-sm text-[#CFCFCF] transition hover:bg-[#FFD600]/10 hover:text-white sm:inline-flex">
                Sign in
              </Link>
              <Link
                to="/creator-signup"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full btn-primary px-4 py-1.5 text-sm font-medium transition"
              >
                List your asset <span aria-hidden>-&gt;</span>
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setAccountOpen(o => !o)}
                className="hidden min-h-10 items-center gap-2 rounded-full glass-panel px-3 py-1.5 text-sm text-white transition hover:border-[#FFD600]/20 hover:bg-[#FFD600]/10 sm:inline-flex"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#CFCFCF]">{user.role}</span>
              </button>
              {accountOpen && (
                <div className="absolute right-0 mt-2 w-48 glass-modal p-2 text-sm">
                  {roleLinks.map(l => (
                    <Link key={l.to} to={l.to} className="block px-3 py-2 rounded-xl hover:bg-[#FFD600]/10">{l.label}</Link>
                  ))}
                  {user.role === "creator" && (
                    <Link to="/creator-dashboard/submit-asset" className="block px-3 py-2 rounded-xl hover:bg-[#FFD600]/10">Submit asset</Link>
                  )}
                  <button
                    onClick={signOut}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#FFD600]/10 text-[#CFCFCF] inline-flex items-center gap-2"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full glass-panel text-white transition hover:border-[#FFD600]/20 hover:bg-[#FFD600]/10 md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-[#050505]/70 backdrop-blur-sm md:hidden transition-all duration-300 ${
          mobileOpen ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-3"
        }`}
      >
        <div className="glass-modal rounded-none border-x-0">
          <nav className="container-mb max-h-[calc(100dvh-4rem)] overflow-y-auto py-4">
            <div className="grid gap-1">
              {navLinks.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center justify-between rounded-2xl px-4 text-base transition ${
                      isActive ? "bg-[#FFD600]/16 text-white" : "text-[#CFCFCF] hover:bg-[#FFD600]/10 hover:text-white"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
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
                  <div className="rounded-2xl glass-panel px-4 py-3">
                    <div className="text-sm text-white">{user.name}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#CFCFCF]/80">{user.role}</div>
                  </div>
                  {user.role === "creator" && (
                    <Link to="/creator-dashboard/submit-asset" className="btn-primary flex min-h-12 items-center justify-center rounded-2xl text-sm font-medium">
                      Submit asset
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl glass-panel text-sm font-medium text-white/75"
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
