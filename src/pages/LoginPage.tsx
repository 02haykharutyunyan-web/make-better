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
      <section className="container-mb pt-20 pb-24 max-w-md mx-auto">
        <div className="eyebrow">Sign in</div>
        <h1 className="mt-5 text-4xl font-medium tracking-[-0.04em]">Welcome back.</h1>
        <p className="mt-3 text-white/55">Sign in with your Make Better account.</p>

        <form onSubmit={submit} className="mt-8 card-premium p-6 space-y-3">
          <label className="block">
            <span className="text-xs text-white/55">Email</span>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30"
            />
          </label>
          <label className="block">
            <span className="text-xs text-white/55">Password</span>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm focus:outline-none focus:border-white/30"
            />
          </label>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button disabled={loading} className="w-full rounded-full bg-white text-black py-3 text-sm font-medium hover:bg-white/90 transition disabled:opacity-50">
            {loading ? "Working..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40 text-center">Quick access</div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={() => quick("buyer")} className="rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-sm hover:bg-white/[0.08]">Buyer</button>
            <button onClick={() => quick("creator")} className="rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-sm hover:bg-white/[0.08]">Creator</button>
            <button onClick={() => quick("admin")} className="rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-sm hover:bg-white/[0.08]">Admin</button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-white/55">
          New creator? <Link to="/creator-signup" className="text-white hover:underline">Register here</Link>
        </p>
      </section>
    </SiteLayout>
  );
}
