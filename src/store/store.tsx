import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { Asset, Creator, BlogPost, Collection, ProductType } from "@/data/marketplace";
import { supabase } from "@/lib/supabase/client";
import { dbAssetToSubmittedAsset } from "@/lib/asset-mappers";
import { requireSupabaseConfig } from "@/lib/supabase/errors";
import { publicEnv } from "@/lib/env";
import { claimFreeAssetBySlug, createCreator, getCreatorByProfileId, getPublishedAssetBySlug, listMyAssetClaims, upsertProfile } from "@/services";
import type { Tables } from "@/types/database";

export type Role = "buyer" | "creator" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  creatorSlug?: string;
  createdAt: string;
  active: boolean;
};

export type AssetStatus = "Draft" | "Pending Review" | "Approved" | "Rejected" | "Published";

export type SubmittedAsset = Asset & {
  id: string;
  status: AssetStatus;
  isFree: boolean;
  priceType: "free" | "paid";
  submittedAt: string;
  rejectionReason?: string;
  featured?: boolean;
  useCases?: string[];
  included?: string[];
  before?: string[];
  after?: string[];
  fullDescription?: string;
};

export type Claim = {
  id: string;
  userId: string;
  assetSlug: string;
  status: "Unlocked" | "Paid (mock)" | "Pending payment";
  createdAt: string;
};

type StoreShape = {
  users: User[];
  creators: Creator[];
  assets: SubmittedAsset[];
  claims: Claim[];
  blog: BlogPost[];
  collections: Collection[];
};

const EMPTY_STORE: StoreShape = {
  users: [],
  creators: [],
  assets: [],
  claims: [],
  blog: [],
  collections: [],
};

function load(): StoreShape {
  return EMPTY_STORE;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function profileToUser(profile: Tables<"profiles">, creator?: Tables<"creators"> | null): User {
  return {
    id: profile.id,
    name: profile.full_name || profile.email || "User",
    email: profile.email || "",
    phone: profile.phone || undefined,
    role: profile.role,
    creatorSlug: creator?.slug,
    createdAt: profile.created_at,
    active: profile.active,
  };
}

function claimStatusLabel(status: Tables<"asset_claims">["status"]): Claim["status"] {
  if (status === "unlocked") return "Unlocked";
  if (status === "paid_mock") return "Paid (mock)";
  return "Pending payment";
}

type Ctx = {
  user: User | null;
  authLoading: boolean;
  store: StoreShape;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  signupBuyer: (data: { name: string; email: string; password: string; phone?: string }) => Promise<User | null>;
  signupCreator: (data: { name: string; email: string; password: string; phone?: string; brand: string; bio: string }) => Promise<User | null>;
  claimAsset: (asset: SubmittedAsset) => Promise<Claim>;
  myClaims: () => (Claim & { asset?: SubmittedAsset })[];
  submitAsset: (data: Partial<SubmittedAsset>) => SubmittedAsset;
  updateAsset: (id: string, patch: Partial<SubmittedAsset>) => void;
  deleteAsset: (id: string) => void;
  upsertBlog: (post: BlogPost) => void;
  deleteBlog: (slug: string) => void;
  upsertCollection: (c: Collection & { status?: string; seoIntro?: string; relatedBlog?: string[]; selectedAssets?: string[] }) => void;
  deleteCollection: (slug: string) => void;
  updateUser: (id: string, patch: Partial<User>) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>(() => load());
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [remoteClaims, setRemoteClaims] = useState<Claim[]>([]);

  const update = (fn: (s: StoreShape) => StoreShape) => setStore(prev => fn({ ...prev }));

  const rememberUser = (nextUser: User | null) => {
    setUser(nextUser);
    if (!nextUser) return;
    update(s => {
      const existing = s.users.find(u => u.id === nextUser.id);
      return {
        ...s,
        users: existing
          ? s.users.map(u => u.id === nextUser.id ? { ...u, ...nextUser } : u)
          : [nextUser, ...s.users],
      };
    });
  };

  const loadCurrentProfile = async () => {
    requireSupabaseConfig();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      rememberUser(null);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      rememberUser(null);
      return null;
    }

    const creator = profile.role === "creator" ? await getCreatorByProfileId(profile.id) : null;
    const nextUser = profileToUser(profile, creator);
    rememberUser(nextUser);

    const claims = await listMyAssetClaims(profile.id);
    const mappedClaims: Claim[] = claims.map(c => ({
      id: c.id,
      userId: c.user_id,
      assetSlug: c.assets?.slug || "",
      status: claimStatusLabel(c.status),
      createdAt: c.created_at,
    })).filter(c => c.assetSlug);
    setRemoteClaims(mappedClaims);
    const claimedAssets = claims
      .map(c => c.assets ? dbAssetToSubmittedAsset(c.assets as any) : null)
      .filter(Boolean) as SubmittedAsset[];
    if (claimedAssets.length > 0) {
      update(s => ({
        ...s,
        assets: [
          ...claimedAssets.filter(a => !s.assets.some(existing => existing.slug === a.slug)),
          ...s.assets,
        ],
      }));
    }

    return nextUser;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        requireSupabaseConfig();
        const nextUser = await loadCurrentProfile();
        if (!mounted) return;
        setUser(nextUser);
      } catch (error) {
        console.error("Failed to load Supabase profile", error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    init();

    if (!publicEnv.hasSupabaseConfig) {
      return () => {
        mounted = false;
      };
    }

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setAuthLoading(true);
      window.setTimeout(() => {
        loadCurrentProfile()
          .catch(error => {
            console.error("Failed to refresh Supabase profile", error);
            rememberUser(null);
          })
          .finally(() => setAuthLoading(false));
      }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const ensureBuyerProfile = async (authUserId: string, data: { name: string; email: string; phone?: string }) => {
    requireSupabaseConfig();
    await upsertProfile({
      id: authUserId,
      full_name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: "buyer",
      active: true,
    });
  };

  const ensureCreatorProfile = async (authUserId: string, data: { name: string; email: string; phone?: string; brand: string; bio: string }) => {
    requireSupabaseConfig();
    await upsertProfile({
      id: authUserId,
      full_name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: "creator",
      active: true,
    });

    const existingCreator = await getCreatorByProfileId(authUserId);
    if (!existingCreator) {
      const slug = slugify(data.brand) || `creator-${Date.now()}`;
      await createCreator({
        profile_id: authUserId,
        slug,
        brand_name: data.brand,
        niche: data.bio.slice(0, 60),
        description: data.bio,
        monthly_revenue: "-",
      });
    }
  };

  const ctx: Ctx = {
    user,
    authLoading,
    store,
    login: async (email, password) => {
      requireSupabaseConfig();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return loadCurrentProfile();
    },
    logout: async () => {
      requireSupabaseConfig();
      await supabase.auth.signOut();
      setRemoteClaims([]);
      rememberUser(null);
    },
    signupBuyer: async ({ name, email, password, phone }) => {
      requireSupabaseConfig();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone, role: "buyer" } },
      });
      if (error) throw error;
      if (data.user && data.session) await ensureBuyerProfile(data.user.id, { name, email, phone });
      return loadCurrentProfile();
    },
    signupCreator: async ({ name, email, password, phone, brand, bio }) => {
      requireSupabaseConfig();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, phone, role: "creator", brand_name: brand, bio } },
      });
      if (error) throw error;
      if (data.user && data.session) await ensureCreatorProfile(data.user.id, { name, email, phone, brand, bio });

      return loadCurrentProfile();
    },
    claimAsset: async (asset) => {
      requireSupabaseConfig();
      const currentUserId = user?.id;
      if (!currentUserId) throw new Error("Sign in before claiming this asset.");
      const existing = store.claims.find(c => c.userId === currentUserId && c.assetSlug === asset.slug);
      if (existing) return existing;
      const existingRemote = remoteClaims.find(c => c.userId === currentUserId && c.assetSlug === asset.slug);
      if (existingRemote) return existingRemote;

      if (asset.isFree) {
        const remoteClaim = await claimFreeAssetBySlug(asset.slug, currentUserId);
        const remoteAsset = await getPublishedAssetBySlug(asset.slug);
        const claimedAsset = remoteAsset ? dbAssetToSubmittedAsset(remoteAsset as any) : asset;
        const claim: Claim = {
          id: remoteClaim.id,
          userId: remoteClaim.user_id,
          assetSlug: asset.slug,
          status: "Unlocked",
          createdAt: remoteClaim.created_at,
        };
        setRemoteClaims(prev => [claim, ...prev.filter(c => c.assetSlug !== claim.assetSlug)]);
        update(s => ({
          ...s,
          assets: [
            claimedAsset,
            ...s.assets.filter(a => a.slug !== claimedAsset.slug),
          ],
          claims: [...s.claims.filter(c => !(c.userId === currentUserId && c.assetSlug === asset.slug)), claim],
        }));
        return claim;
      }

      const claim: Claim = {
        id: `c-${Date.now()}`,
        userId: currentUserId!,
        assetSlug: asset.slug,
        status: asset.isFree ? "Unlocked" : "Pending payment",
        createdAt: new Date().toISOString(),
      };
      update(s => ({ ...s, claims: [...s.claims, claim] }));
      return claim;
    },
    myClaims: () => {
      if (!user?.id) return [];
      const merged = [...remoteClaims, ...store.claims].filter((claim, index, all) =>
        all.findIndex(c => c.userId === claim.userId && c.assetSlug === claim.assetSlug) === index
      );
      return merged
        .filter(c => c.userId === user.id)
        .map(c => ({ ...c, asset: store.assets.find(a => a.slug === c.assetSlug) }));
    },
    submitAsset: (data) => {
      const slug = slugify(data.title || "asset") + `-${Date.now().toString(36)}`;
      const asset: SubmittedAsset = {
        slug,
        id: `a-${Date.now()}`,
        title: data.title || "Untitled",
        category: `${data.productType || "Prompts"}`,
        productType: (data.productType as ProductType) || "Prompts",
        description: data.description || "",
        longDescription: data.fullDescription || "",
        tags: data.tags || [],
        price: data.price || 0,
        downloads: 0,
        rating: 0,
        reviewCount: 0,
        creatorSlug: user?.creatorSlug || "",
        collectionSlugs: [],
        status: "Pending Review",
        isFree: (data.price || 0) === 0,
        priceType: (data.price || 0) === 0 ? "free" : "paid",
        submittedAt: new Date().toISOString(),
        useCases: data.useCases || [],
        included: data.included || [],
        before: data.before || [],
        after: data.after || [],
        fullDescription: data.fullDescription || "",
      };
      update(s => ({ ...s, assets: [asset, ...s.assets] }));
      return asset;
    },
    updateAsset: (id, patch) => update(s => ({ ...s, assets: s.assets.map(a => a.id === id ? { ...a, ...patch } : a) })),
    deleteAsset: (id) => update(s => ({ ...s, assets: s.assets.filter(a => a.id !== id) })),
    upsertBlog: (post) => update(s => {
      const idx = s.blog.findIndex(p => p.slug === post.slug);
      const blog = [...s.blog];
      if (idx >= 0) blog[idx] = post; else blog.unshift(post);
      return { ...s, blog };
    }),
    deleteBlog: (slug) => update(s => ({ ...s, blog: s.blog.filter(b => b.slug !== slug) })),
    upsertCollection: (c) => update(s => {
      const idx = s.collections.findIndex(x => x.slug === c.slug);
      const cols = [...s.collections];
      if (idx >= 0) cols[idx] = c; else cols.unshift(c);
      return { ...s, collections: cols };
    }),
    deleteCollection: (slug) => update(s => ({ ...s, collections: s.collections.filter(c => c.slug !== slug) })),
    updateUser: (id, patch) => update(s => ({ ...s, users: s.users.map(u => u.id === id ? { ...u, ...patch } : u) })),
  };

  return <StoreCtx.Provider value={ctx}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be within StoreProvider");
  return ctx;
}

export function publicAssets(store: StoreShape) {
  return store.assets.filter(a => a.status === "Published");
}
