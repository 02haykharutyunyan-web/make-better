export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "buyer" | "creator" | "admin";
export type AssetStatus = "draft" | "pending_review" | "approved" | "rejected" | "published";
export type PriceType = "free" | "paid";
export type ClaimStatus = "unlocked" | "pending_payment" | "paid_mock";
export type PublishStatus = "draft" | "pending_review" | "rejected" | "published";
export type DeliveryType = "file" | "external_link" | "text";
export type AccessRequestStatus = "new" | "contacted" | "closed";
export type CreatorStatus = "pending" | "approved" | "rejected";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: UserRole;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      creators: {
        Row: {
          id: string;
          profile_id: string | null;
          slug: string;
          brand_name: string;
          niche: string | null;
          description: string | null;
          tags: string[];
          followers: number;
          assets_count: number;
          downloads: number;
          rating: number;
          monthly_revenue: string | null;
          strengths: string[];
          active: boolean;
          featured: boolean;
          application_status: CreatorStatus;
          application_submitted_at: string;
          application_reviewed_at: string | null;
          application_rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          slug: string;
          brand_name: string;
          niche?: string | null;
          description?: string | null;
          tags?: string[];
          followers?: number;
          assets_count?: number;
          downloads?: number;
          rating?: number;
          monthly_revenue?: string | null;
          strengths?: string[];
          active?: boolean;
          featured?: boolean;
          application_status?: CreatorStatus;
          application_submitted_at?: string;
          application_reviewed_at?: string | null;
          application_rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["creators"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "creators_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      assets: {
        Row: {
          id: string;
          creator_id: string;
          slug: string;
          title: string;
          product_type: string;
          category: string | null;
          short_description: string | null;
          long_description: string | null;
          tags: string[];
          status: AssetStatus;
          is_free: boolean;
          price: number;
          price_type: PriceType;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          preview_image_path: string | null;
          asset_file_path: string | null;
          downloads: number;
          rating: number;
          review_count: number;
          rejection_reason: string | null;
          featured: boolean;
          use_cases: string[];
          included: string[];
          before: string[];
          after: string[];
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          slug: string;
          title: string;
          product_type: string;
          category?: string | null;
          short_description?: string | null;
          long_description?: string | null;
          tags?: string[];
          status?: AssetStatus;
          is_free?: boolean;
          price?: number;
          price_type?: PriceType;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          preview_image_path?: string | null;
          asset_file_path?: string | null;
          downloads?: number;
          rating?: number;
          review_count?: number;
          rejection_reason?: string | null;
          featured?: boolean;
          use_cases?: string[];
          included?: string[];
          before?: string[];
          after?: string[];
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "assets_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          }
        ];
      };
      asset_claims: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          status: ClaimStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          status?: ClaimStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["asset_claims"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "asset_claims_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "asset_claims_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      asset_deliverables: {
        Row: {
          id: string;
          asset_id: string;
          delivery_type: DeliveryType;
          storage_bucket: string | null;
          storage_path: string | null;
          file_name: string | null;
          file_size: number | null;
          external_url: string | null;
          text_content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          delivery_type: DeliveryType;
          storage_bucket?: string | null;
          storage_path?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          external_url?: string | null;
          text_content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["asset_deliverables"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "asset_deliverables_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: true;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          }
        ];
      };
      asset_access_requests: {
        Row: {
          id: string;
          asset_id: string;
          buyer_user_id: string | null;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string | null;
          status: AccessRequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          asset_id: string;
          buyer_user_id?: string | null;
          buyer_name: string;
          buyer_email: string;
          buyer_phone?: string | null;
          status?: AccessRequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["asset_access_requests"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "asset_access_requests_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "asset_access_requests_buyer_user_id_fkey";
            columns: ["buyer_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          rating: number;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          rating: number;
          body?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reviews_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          category: string | null;
          body: string | null;
          creator_id: string | null;
          status: PublishStatus;
          rejection_reason: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          category?: string | null;
          body?: string | null;
          creator_id?: string | null;
          status?: PublishStatus;
          rejection_reason?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "blog_posts_creator_id_fkey";
            columns: ["creator_id"];
            isOneToOne: false;
            referencedRelation: "creators";
            referencedColumns: ["id"];
          }
        ];
      };
      collections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          long_description: string | null;
          best_for: string[];
          related_types: string[];
          related_tags: string[];
          selected_asset_ids: string[];
          related_blog_post_ids: string[];
          status: PublishStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          long_description?: string | null;
          best_for?: string[];
          related_types?: string[];
          related_tags?: string[];
          selected_asset_ids?: string[];
          related_blog_post_ids?: string[];
          status?: PublishStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_blog_draft: {
        Args: { draft_slug: string; draft_title: string; draft_excerpt?: string | null; draft_category?: string | null; draft_body?: string | null };
        Returns: Database["public"]["Tables"]["blog_posts"]["Row"];
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_access_asset_delivery: {
        Args: { target_asset_id: string };
        Returns: boolean;
      };
      is_approved_creator: {
        Args: { target_creator_id: string };
        Returns: boolean;
      };
      creator_application_status_is: {
        Args: { target_creator_id: string; expected_status: CreatorStatus };
        Returns: boolean;
      };
      review_creator_application: {
        Args: {
          target_creator_id: string;
          target_status: CreatorStatus;
          rejection_reason?: string | null;
        };
        Returns: Database["public"]["Tables"]["creators"]["Row"];
      };
      reapply_creator_application: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["creators"]["Row"];
      };

      submit_asset_for_review: {
        Args: { target_asset_id: string };
        Returns: Database["public"]["Tables"]["assets"]["Row"];
      };
      submit_blog_post_for_review: {
        Args: { target_blog_post_id: string };
        Returns: Database["public"]["Tables"]["blog_posts"]["Row"];
      };
      review_asset: {
        Args: { target_asset_id: string; target_status: AssetStatus; rejection_reason?: string | null };
        Returns: Database["public"]["Tables"]["assets"]["Row"];
      };
      review_blog_post: {
        Args: { target_blog_post_id: string; target_status: PublishStatus; rejection_reason?: string | null };
        Returns: Database["public"]["Tables"]["blog_posts"]["Row"];
      };
      set_asset_featured: {
        Args: { target_asset_id: string; target_featured: boolean };
        Returns: Database["public"]["Tables"]["assets"]["Row"];
      };
      set_creator_featured: {
        Args: { target_creator_id: string; target_featured: boolean };
        Returns: Database["public"]["Tables"]["creators"]["Row"];
      };
    };
    Enums: {
      user_role: UserRole;
      asset_status: AssetStatus;
      price_type: PriceType;
      claim_status: ClaimStatus;
      publish_status: PublishStatus;
      delivery_type: DeliveryType;
      access_request_status: AccessRequestStatus;
      creator_status: CreatorStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Inserts<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Updates<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
