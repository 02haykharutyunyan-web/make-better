export type Creator = {
  slug: string;
  name: string;
  niche: string;
  description: string;
  tags: string[];
  followers: number;
  assetsCount: number;
  downloads: number;
  rating: number;
  monthlyRevenue: string;
  strengths: string[];
};

export type Asset = {
  slug: string;
  title: string;
  category: string;
  productType: ProductType;
  description: string;
  longDescription?: string;
  tags: string[];
  price: number; // 0 = free
  downloads: number;
  rating: number;
  reviewCount: number;
  creatorSlug: string;
  creatorName?: string;
  collectionSlugs: string[];
};

export type Collection = {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  bestFor: string[];
  relatedTypes: ProductType[];
  relatedTags?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  creatorSlug?: string;
  body: string;
};

export type ProductType =
  | "Prompts"
  | "AI Agents"
  | "AI Assistants"
  | "API Tools"
  | "Workflows"
  | "Templates"
  | "Automation Assets"
  | "Creator Resources";

export const productTypes: { type: ProductType; count: number; description: string }[] = [
  { type: "Prompts", count: 128, description: "Battle-tested prompt systems for ChatGPT, Claude, and other LLMs." },
  { type: "AI Agents", count: 64, description: "Goal-driven autonomous agents that complete real tasks end-to-end." },
  { type: "AI Assistants", count: 52, description: "Configured copilots that follow your workflow and tone of voice." },
  { type: "API Tools", count: 31, description: "Drop-in API utilities and connectors to extend any AI stack." },
  { type: "Workflows", count: 76, description: "Step-by-step automated playbooks combining tools, prompts, and logic." },
  { type: "Templates", count: 44, description: "Reusable structures for documents, briefs, decks, and content." },
  { type: "Automation Assets", count: 39, description: "Make, n8n and Zapier blueprints to remove repetitive busywork." },
  { type: "Creator Resources", count: 58, description: "Brand kits, prompt packs, and operating systems for creators." },
];

export const creators: Creator[] = [
  {
    slug: "growth-lab",
    name: "Growth Lab",
    niche: "Ecommerce & growth systems",
    description: "Growth Lab turns repeatable growth processes into ready-to-use AI assets for founders, marketers, and ecommerce teams.",
    tags: ["Ecommerce", "Shopify", "Growth"],
    followers: 2400,
    assetsCount: 14,
    downloads: 12400,
    rating: 4.9,
    monthlyRevenue: "~$3.5k/mo",
    strengths: ["Validated playbooks", "Battle-tested with 6-figure stores", "Constant updates"],
  },
  {
    slug: "outbound-studio",
    name: "Outbound Studio",
    niche: "Sales assets and outreach systems",
    description: "Outbound Studio packages high-converting outbound sequences and sales workflows used by B2B teams.",
    tags: ["Sales", "Cold Email", "B2B"],
    followers: 1800,
    assetsCount: 9,
    downloads: 8100,
    rating: 4.8,
    monthlyRevenue: "~$3.1k/mo",
    strengths: ["Reply-rate tested", "Personalization at scale", "CRM-ready"],
  },
  {
    slug: "rank-better",
    name: "Rank Better",
    niche: "SEO and content workflows",
    description: "Rank Better builds the SEO and content workflows behind some of the fastest-growing programmatic sites.",
    tags: ["SEO", "Content", "Programmatic"],
    followers: 3100,
    assetsCount: 18,
    downloads: 16200,
    rating: 4.9,
    monthlyRevenue: "~$4.2k/mo",
    strengths: ["E-E-A-T compliant", "Topical authority focused", "Scales to 1000+ pages"],
  },
];

export const collections: Collection[] = [
  {
    slug: "grow-shopify",
    title: "Grow a Shopify Store",
    description: "Curated AI assets to find winners, scale offers, and ship faster on Shopify.",
    longDescription: "Everything you need to validate products, build offers that convert, and operate a Shopify store like a senior growth team.",
    bestFor: ["Shopify founders", "DTC growth marketers", "Media buyers"],
    relatedTypes: ["AI Agents", "Workflows", "Templates"],
  },
  {
    slug: "more-leads",
    title: "Get More Leads",
    description: "Outbound sequences, lead-gen agents and ICP-research tools that pack pipelines.",
    longDescription: "Use proven outbound and inbound systems to identify your ICP, enrich data, and book more qualified meetings.",
    bestFor: ["Founders", "SDRs", "Agencies"],
    relatedTypes: ["AI Agents", "Workflows", "Prompts"],
  },
  {
    slug: "better-content",
    title: "Create Better Content",
    description: "Content engines, brief templates, and creator workflows for shipping more, faster.",
    longDescription: "Stop staring at the blank page. These assets give you ideas, briefs, structures, and finished drafts on demand.",
    bestFor: ["Creators", "Content teams", "Solo founders"],
    relatedTypes: ["Prompts", "Templates", "AI Assistants"],
  },
  {
    slug: "rank-google",
    title: "Rank Higher on Google",
    description: "SEO workflows for clusters, briefs, internal links, and programmatic pages.",
    longDescription: "From topical maps to programmatic SEO at scale — assets used by sites pulling in 100k+ organic visits.",
    bestFor: ["SEO leads", "Content founders", "Agencies"],
    relatedTypes: ["Workflows", "Prompts", "Templates"],
  },
  {
    slug: "better-support",
    title: "Improve Customer Support",
    description: "AI assistants and templates that resolve more tickets without losing the human tone.",
    longDescription: "Reduce response time and ticket volume while keeping customers happy with assistants tuned to your brand.",
    bestFor: ["Support leads", "Ops teams", "SaaS founders"],
    relatedTypes: ["AI Assistants", "Templates", "Automation Assets"],
  },
  {
    slug: "automate-work",
    title: "Automate Repetitive Work",
    description: "Make, n8n and Zapier blueprints that remove the boring 30% of your week.",
    longDescription: "Automation blueprints to delete the meetings, the spreadsheets, and the copy-paste tax from your operation.",
    bestFor: ["Ops", "Founders", "Agencies"],
    relatedTypes: ["Automation Assets", "Workflows", "API Tools"],
  },
];

export const assets: Asset[] = [
  {
    slug: "dropshipping-product-research-agent",
    title: "Dropshipping Product Research Agent",
    category: "AI Agent • Ecommerce",
    productType: "AI Agents",
    description: "Find winning products, analyze competitors, uncover demand signals, and generate offer angles in minutes instead of hours.",
    longDescription: "An end-to-end research agent built for store owners who want a repeatable validation system instead of guessing.",
    tags: ["Shopify", "Product Research", "DTC"],
    price: 19,
    downloads: 1840,
    rating: 4.9,
    reviewCount: 126,
    creatorSlug: "growth-lab",
    collectionSlugs: ["grow-shopify"],
  },
  {
    slug: "cold-email-reply-engine",
    title: "Cold Email Reply Engine",
    category: "Workflow • Sales",
    productType: "Workflows",
    description: "An outbound system that researches, personalizes, and writes 100 cold emails in the time it takes to write 5.",
    tags: ["Cold Email", "Outbound", "B2B"],
    price: 29,
    downloads: 920,
    rating: 4.8,
    reviewCount: 81,
    creatorSlug: "outbound-studio",
    collectionSlugs: ["more-leads"],
  },
  {
    slug: "seo-cluster-builder",
    title: "SEO Topical Cluster Builder",
    category: "Workflow • SEO",
    productType: "Workflows",
    description: "Generate full topical maps, supporting briefs, and internal linking plans for any niche in one run.",
    tags: ["SEO", "Content", "Briefs"],
    price: 24,
    downloads: 1410,
    rating: 4.9,
    reviewCount: 102,
    creatorSlug: "rank-better",
    collectionSlugs: ["rank-google", "better-content"],
  },
  {
    slug: "tiktok-hook-prompt-pack",
    title: "TikTok Hook Prompt Pack",
    category: "Prompts • Content",
    productType: "Prompts",
    description: "60+ proven hook frameworks adapted into prompts you can run today to script viral short-form video.",
    tags: ["TikTok", "Hooks", "Short-form"],
    price: 0,
    downloads: 5200,
    rating: 4.7,
    reviewCount: 312,
    creatorSlug: "growth-lab",
    collectionSlugs: ["better-content"],
  },
  {
    slug: "support-assistant-saas",
    title: "Support Assistant for SaaS",
    category: "AI Assistant • Support",
    productType: "AI Assistants",
    description: "A configured assistant that resolves tier-1 tickets in your tone, with handoff to humans when needed.",
    tags: ["Support", "SaaS", "Assistant"],
    price: 39,
    downloads: 640,
    rating: 4.8,
    reviewCount: 47,
    creatorSlug: "outbound-studio",
    collectionSlugs: ["better-support"],
  },
  {
    slug: "n8n-content-repurpose",
    title: "n8n Content Repurpose Blueprint",
    category: "Automation • Content",
    productType: "Automation Assets",
    description: "Turn one long-form piece into 12 channel-ready posts automatically, every week, without lifting a finger.",
    tags: ["n8n", "Repurposing", "Automation"],
    price: 15,
    downloads: 1120,
    rating: 4.8,
    reviewCount: 88,
    creatorSlug: "rank-better",
    collectionSlugs: ["automate-work", "better-content"],
  },
  {
    slug: "icp-research-agent",
    title: "ICP Research Agent",
    category: "AI Agent • Sales",
    productType: "AI Agents",
    description: "Build a sharp ICP, enrich target accounts, and pre-write 1:1 personalization for every contact.",
    tags: ["ICP", "Sales", "Research"],
    price: 22,
    downloads: 780,
    rating: 4.9,
    reviewCount: 64,
    creatorSlug: "outbound-studio",
    collectionSlugs: ["more-leads"],
  },
  {
    slug: "shopify-offer-angle-generator",
    title: "Shopify Offer Angle Generator",
    category: "Prompts • Ecommerce",
    productType: "Prompts",
    description: "A prompt system that turns any product into 20 distinct offer angles ready to test as ads.",
    tags: ["Offers", "Ads", "Shopify"],
    price: 12,
    downloads: 1980,
    rating: 4.9,
    reviewCount: 154,
    creatorSlug: "growth-lab",
    collectionSlugs: ["grow-shopify"],
  },
  {
    slug: "programmatic-seo-template",
    title: "Programmatic SEO Page Template",
    category: "Template • SEO",
    productType: "Templates",
    description: "A production-ready page template and data structure for shipping 1,000+ programmatic pages that rank.",
    tags: ["Programmatic", "SEO", "Templates"],
    price: 35,
    downloads: 510,
    rating: 4.8,
    reviewCount: 39,
    creatorSlug: "rank-better",
    collectionSlugs: ["rank-google"],
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: "choose-right-ai-workflow",
    title: "How to choose the right AI workflow for your business",
    excerpt: "Most teams pick tools before they pick problems. Here's a saner framework for choosing AI workflows that actually compound.",
    category: "Strategy",
    date: "Apr 12, 2026",
    body: "Pick the problem first, then the workflow, then the tool. The order matters more than the stack.",
  },
  {
    slug: "agents-vs-assistants",
    title: "AI agents vs AI assistants: what should you buy?",
    excerpt: "They sound similar, but they solve very different problems. A practical breakdown for buyers.",
    category: "Buying Guide",
    date: "Apr 03, 2026",
    body: "Assistants augment a person. Agents replace a process. Buy the one that matches your bottleneck.",
  },
  {
    slug: "ai-assets-creators-launch-faster",
    title: "Best AI assets for creators launching faster",
    excerpt: "From idea to launch in a weekend. The asset stack creators are using to ship more in less time.",
    category: "Creators",
    date: "Mar 27, 2026",
    body: "Speed is a moat. These assets compress the boring parts of launching so you can ship.",
  },
  {
    slug: "winning-shopify-products-with-ai",
    title: "How we find winning Shopify products with AI",
    excerpt: "Inside the exact research loop Growth Lab uses to validate winners before spending a dollar on ads.",
    category: "Ecommerce",
    date: "Apr 18, 2026",
    creatorSlug: "growth-lab",
    body: "Validation is a process, not a vibe. Here's the loop.",
  },
  {
    slug: "7-offer-angles-ecommerce",
    title: "7 offer angles that convert better in ecommerce",
    excerpt: "The same product, packaged 7 ways. The angles that consistently outperform in our tests.",
    category: "Ecommerce",
    date: "Apr 09, 2026",
    creatorSlug: "growth-lab",
    body: "Angles beat creative. Creative beats targeting. In that order.",
  },
  {
    slug: "reduce-failed-product-tests",
    title: "How to reduce failed product tests",
    excerpt: "If 8/10 tests fail, you don't have a creative problem — you have a selection problem. Here's the fix.",
    category: "Ecommerce",
    date: "Mar 30, 2026",
    creatorSlug: "growth-lab",
    body: "Selection is upstream of everything. Fix it first.",
  },
];

export const platformStats = {
  assets: "420+",
  creators: "80+",
  visitors: "30k+",
  downloads: "12k+",
};

export function getCreator(slug: string) {
  return creators.find(c => c.slug === slug);
}
export function getAsset(slug: string) {
  return assets.find(a => a.slug === slug);
}
export function getCollection(slug: string) {
  return collections.find(c => c.slug === slug);
}
export function getPost(slug: string) {
  return blogPosts.find(p => p.slug === slug);
}
export function assetsByCreator(slug: string) {
  return assets.filter(a => a.creatorSlug === slug);
}
export function postsByCreator(slug: string) {
  return blogPosts.filter(p => p.creatorSlug === slug);
}
export function assetsInCollection(slug: string) {
  return assets.filter(a => a.collectionSlugs.includes(slug));
}
