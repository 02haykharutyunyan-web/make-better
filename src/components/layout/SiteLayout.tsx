import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { AmbientBackground } from "@/components/visuals/MarketplaceVisuals";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AmbientBackground />
      <Header />
      <main className="flex-1 pt-16">{children}</main>
      <Footer />
    </div>
  );
}
