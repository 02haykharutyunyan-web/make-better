import { Link } from "react-router-dom";
import SiteLayout from "@/components/layout/SiteLayout";

export default function NotFound() {
  return (
    <SiteLayout>
      <section className="container-mb min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="eyebrow">404</div>
        <h1 className="mt-5 text-4xl sm:text-5xl md:text-7xl font-medium tracking-[-0.04em]">Page not found</h1>
        <p className="mt-4 text-[#94A3B8] max-w-md">The asset you're looking for might have moved. Head back to the marketplace.</p>
        <Link to="/" className="mt-8 inline-flex min-h-12 items-center rounded-full btn-primary px-6 py-3 text-sm font-medium hover:bg-[#FB923C]">Back home</Link>
      </section>
    </SiteLayout>
  );
}
