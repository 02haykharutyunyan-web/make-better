import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 sm:mt-32">
      <div className="container-mb py-12 sm:py-16 grid gap-10 sm:gap-12 md:grid-cols-4">
        <div className="md:col-span-2 max-w-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[#0E0E0E] text-[13px] font-semibold shadow-[0_0_24px_rgba(255,214,0,0.16)]">M</span>
            <span className="text-[15px] font-medium">Make Better<span className="text-[#CFCFCF]/70">.</span></span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#CFCFCF]">
            A premium marketplace for AI assets. Discover prompts, agents, assistants, workflows, and templates built to help you do better work.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#CFCFCF]">Marketplace</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/assets" className="text-[#CFCFCF] transition hover:text-[#FFD600]">Assets</Link></li>
            <li><Link to="/collections" className="text-[#CFCFCF] transition hover:text-[#FFD600]">Collections</Link></li>
            <li><Link to="/creators" className="text-[#CFCFCF] transition hover:text-[#FFD600]">Creators</Link></li>
            <li><Link to="/blog" className="text-[#CFCFCF] transition hover:text-[#FFD600]">Blog</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-[#CFCFCF]">Creators</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/submit" className="text-[#CFCFCF] transition hover:text-[#FFD600]">List your asset</Link></li>
            <li><Link to="/creator-guidelines" className="text-[#CFCFCF] transition hover:text-[#FFD600]">Creator guidelines</Link></li>
            <li><Link to="/payouts" className="text-[#CFCFCF] transition hover:text-[#FFD600]">Payouts</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-mb py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#CFCFCF]/70">
          <div>© 2026 Make Better. All rights reserved.</div>
          <div className="flex flex-wrap gap-5">
            <Link to="/privacy" className="transition hover:text-[#FFD600]">Privacy</Link>
            <Link to="/terms" className="transition hover:text-[#FFD600]">Terms</Link>
            <Link to="/contact" className="transition hover:text-[#FFD600]">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
