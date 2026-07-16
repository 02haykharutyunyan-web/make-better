import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { useStore } from "@/store/store";
import { explainSupabaseError } from "@/lib/supabase/errors";

export default function LoginPage() {
  const { login } = useStore();
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



  return (
    <SiteLayout>
      <section className="container-mb pt-14 sm:pt-20 pb-20 sm:pb-24 max-w-md mx-auto">
        <div className="eyebrow">Sign in</div>
        <h1 className="mt-5 text-3xl sm:text-4xl font-medium tracking-normal">Welcome back.</h1>
        <p className="mt-3 text-[#CFCFCF]">Sign in with your Make Better account.</p>

        <form onSubmit={submit} className="mt-8 card-premium p-5 sm:p-6 space-y-4">
          <label className="block">
            <span className="text-xs text-[#CFCFCF]">Email</span>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[#CFCFCF]">Password</span>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl bg-[#0E0E0E]/75 border border-white/10 px-3.5 py-3 text-base sm:text-sm focus:outline-none focus:border-[#FFD600]/70"
            />
          </label>
          {err && <p className="text-xs text-[#CFCFCF]">{err}</p>}
          <button disabled={loading} className="min-h-12 w-full rounded-full btn-primary py-3 text-sm font-medium transition disabled:opacity-50">
            {loading ? "Working..." : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#CFCFCF]">
          New creator? <Link to="/creator-signup" className="text-white hover:underline">Register here</Link>
        </p>
      </section>
    </SiteLayout>
  );
}
