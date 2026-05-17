import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-32 border-t border-white/10">
      <div className="container-mb py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2 max-w-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-[13px] font-semibold">M</span>
            <span className="text-[15px] font-medium">Make Better<span className="text-white/40">.</span></span>
          </div>
          <p className="mt-4 text-sm text-white/60 leading-relaxed">
            A premium marketplace for AI assets. Discover prompts, agents, assistants, workflows, and templates built to help you do better work.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Marketplace</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/assets" className="text-white/70 hover:text-white">Assets</Link></li>
            <li><Link to="/collections" className="text-white/70 hover:text-white">Collections</Link></li>
            <li><Link to="/creators" className="text-white/70 hover:text-white">Creators</Link></li>
            <li><Link to="/blog" className="text-white/70 hover:text-white">Blog</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">Creators</div>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link to="/submit" className="text-white/70 hover:text-white">List your asset</Link></li>
            <li><a className="text-white/70 hover:text-white" href="#">Creator guidelines</a></li>
            <li><a className="text-white/70 hover:text-white" href="#">Payouts</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-mb py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div>© 2026 Make Better. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-white/70">Privacy</a>
            <a href="#" className="hover:text-white/70">Terms</a>
            <a href="#" className="hover:text-white/70">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
