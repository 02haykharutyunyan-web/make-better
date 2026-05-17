import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function LoginPage() {
  const { login, loginAs } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const u = await login(email, password);
      if (!u) { setErr("No profile found for this account."); return; }
      navigate(u.role === "admin" ? "/admin" : u.role === "creator" ? "/creator-dashboard" : "/my-assets");
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  };

  const quick = async (role: "admin" | "creator" | "buyer") => {
    setErr("");
    setLoading(true);
    try {
      const u = await loginAs(role);
      if (!u) { setErr("Account created. Confirm the email, then sign in."); return null; }
      navigate(u.role === "admin" ? "/admin" : u.role === "creator" ? "/creator-dashboard" : "/my-assets");
      return u;
    } catch (error) {
      setErr(explainSupabaseError(error, "Unable to continue."));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <section className="container-mb pt-14 sm:pt-20 pb-20 sm:pb-24 max-w-md mx-auto">
        <div className="eyebrow">Sign in</div>
        <h1 className="mt-5 text-3xl sm:text-4xl font-medium tracking-[-0.04em]">Welcome back.</h1>
        <p className="mt-3 text-[#94A3B8]">Sign in with your Make Better account.</p>

        <form onSubmit={submit} className="mt-8 card-premium p-5 sm:p-6 space-y-4">
          <label className="block">
            <span className="text-xs text-[#94A3B8]">Email</span>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#94A3B8]">Password</span>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#111827]/75 border border-[#1E293B] px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#3B82F6]/70"
            />
          </label>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button disabled={loading} className="min-h-12 w-full rounded-full btn-primary py-3 text-sm font-medium transition disabled:opacity-50">
            {loading ? "Working..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8">
          <div className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]/70 text-center">Quick access</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button onClick={() => quick("buyer")} className="min-h-11 rounded-full border border-[#1E293B] bg-[#111827]/75 py-2.5 text-sm hover:bg-[#2563FF]/15">Buyer</button>
            <button onClick={() => quick("creator")} className="min-h-11 rounded-full border border-[#1E293B] bg-[#111827]/75 py-2.5 text-sm hover:bg-[#2563FF]/15">Creator</button>
            <button onClick={() => quick("admin")} className="min-h-11 rounded-full border border-[#1E293B] bg-[#111827]/75 py-2.5 text-sm hover:bg-[#2563FF]/15">Admin</button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-[#94A3B8]">
          New creator? <Link to="/creator-signup" className="text-white hover:underline">Register here</Link>
        </p>
      </section>
    </SiteLayout>
  );
}
