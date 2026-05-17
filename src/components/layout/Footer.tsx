import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-[#1E293B] sm:mt-32">
      <div className="container-mb py-12 sm:py-16 grid gap-10 sm:gap-12 md:grid-cols-4">
        <div className="md:col-span-2 max-w-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1E293B] bg-[#111827] text-[13px] font-semibold shadow-[0_0_24px_rgba(37,99,255,0.16)]">M</span>
            <span className="text-[15px] font-medium">Make Better<span className="text-[#94A3B8]/70">.</span></span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#94A3B8]">
            A premium marketplace for AI assets. Discover prompts, agents, assistants, workflows, and templates built to help you do better work.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Marketplace</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/assets" className="text-[#94A3B8] transition hover:text-[#F97316]">Assets</Link></li>
            <li><Link to="/collections" className="text-[#94A3B8] transition hover:text-[#F97316]">Collections</Link></li>
            <li><Link to="/creators" className="text-[#94A3B8] transition hover:text-[#F97316]">Creators</Link></li>
            <li><Link to="/blog" className="text-[#94A3B8] transition hover:text-[#F97316]">Blog</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#94A3B8]">Creators</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/submit" className="text-[#94A3B8] transition hover:text-[#F97316]">List your asset</Link></li>
            <li><a className="text-[#94A3B8] transition hover:text-[#F97316]" href="#">Creator guidelines</a></li>
            <li><a className="text-[#94A3B8] transition hover:text-[#F97316]" href="#">Payouts</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#1E293B]">
        <div className="container-mb py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#94A3B8]/70">
          <div>© 2026 Make Better. All rights reserved.</div>
          <div className="flex flex-wrap gap-5">
            <a href="#" className="transition hover:text-[#F97316]">Privacy</a>
            <a href="#" className="transition hover:text-[#F97316]">Terms</a>
            <a href="#" className="transition hover:text-[#F97316]">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
