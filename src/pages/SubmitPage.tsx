import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";
import { Check } from "lucide-react";
import { useStore } from "@/store/store";

const benefits = [
  "Supabase-backed creator dashboard",
  "Private deliverable upload",
  "Admin review before public listing",
  "Free claims and paid waitlist support",
];

export default function SubmitPage() {
  const { user } = useStore();
  const isCreator = user?.role === "creator";
  const isAdmin = user?.role === "admin";
  const actionTo = isCreator ? "/creator-dashboard/submit-asset" : isAdmin ? "/admin/assets" : "/creator-signup";
  const actionLabel = isCreator ? "Submit in dashboard" : isAdmin ? "Review assets" : "Create creator account";

  return (
    <SiteLayout>
      <section className="container-mb pt-12 sm:pt-16 md:pt-24 grid min-w-0 gap-10 sm:gap-14 lg:grid-cols-[1.1fr_minmax(0,1fr)] items-start">
        <div>
          <div className="eyebrow">List your asset</div>
          <h1 className="mt-5 text-3xl sm:text-4xl md:text-6xl font-medium tracking-normal leading-[1.06]">
            What you already use to work faster can become a product.
          </h1>
          <p className="mt-5 text-[#CFCFCF] text-base sm:text-lg leading-relaxed max-w-xl">
            Production submissions happen inside the creator dashboard so assets, deliverables, and review status stay synced with Supabase.
          </p>

          <div className="mt-10 grid gap-3">
            {benefits.map(b => (
              <div key={b} className="flex items-center gap-3 text-white/80">
                <span className="h-7 w-7 rounded-full border border-white/10 bg-[#0E0E0E]/80 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-[#FFD600]" />
                </span>
                {b}
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium p-5 sm:p-8 md:p-10">
          <h2 className="text-2xl font-medium tracking-normal">Continue to the live workflow</h2>
          <p className="mt-3 text-[#CFCFCF]">
            This keeps creator identity, asset status, and private delivery attached to the right Supabase records.
          </p>
          <Link to={actionTo} className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full btn-primary px-6 py-3 text-sm font-medium transition">
            {actionLabel}
          </Link>
          {!user && (
            <p className="mt-4 text-center text-xs text-[#CFCFCF]/70">
              Already registered? <Link to="/login" className="text-white hover:underline">Sign in</Link>
            </p>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
