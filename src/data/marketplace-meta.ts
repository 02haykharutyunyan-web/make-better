import type { ProductType } from "@/data/marketplace";

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

export const platformStats = {
  assets: "420+",
  creators: "80+",
  visitors: "120k+",
  downloads: "38k+",
};
