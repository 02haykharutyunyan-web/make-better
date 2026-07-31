import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import CreatorApprovalGate from "@/components/CreatorApprovalGate";

import Seo from "@/components/Seo";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AssetsPage = lazy(() => import("./pages/Assets.tsx"));
const AssetPage = lazy(() => import("./pages/AssetPage.tsx"));
const CreatorsPage = lazy(() => import("./pages/CreatorsPage.tsx"));
const CreatorPage = lazy(() => import("./pages/CreatorPage.tsx"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage.tsx"));
const CollectionPage = lazy(() => import("./pages/CollectionPage.tsx"));
const BlogPage = lazy(() => import("./pages/BlogPage.tsx"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage.tsx"));
const SubmitPage = lazy(() => import("./pages/SubmitPage.tsx"));
const TrustPages = lazy(() => import("./pages/TrustPages.tsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const MyAssetsPage = lazy(() => import("./pages/MyAssetsPage.tsx"));
const CreatorSignupPage = lazy(() => import("./pages/CreatorSignupPage.tsx"));
const CreatorDashboard = lazy(() => import("./pages/creator/CreatorDashboard.tsx"));
const SubmitAssetPage = lazy(() => import("./pages/creator/SubmitAssetPage.tsx"));
const EditAssetPage = lazy(() => import("./pages/creator/EditAssetPage.tsx"));
const EditBlogPostPage = lazy(() => import("./pages/creator/EditBlogPostPage.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminCreators = lazy(() => import("./pages/admin/AdminCreators.tsx"));
const AdminAssets = lazy(() => import("./pages/admin/AdminAssets.tsx"));
const AdminAccessRequests = lazy(() => import("./pages/admin/AdminAccessRequests.tsx"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog.tsx"));
const AdminCollections = lazy(() => import("./pages/admin/AdminCollections.tsx"));
const BlogPreviewPage = lazy(() => import("./pages/BlogPreviewPage.tsx"));
const FreeClaimCallbackPage = lazy(() => import("./pages/FreeClaimCallbackPage.tsx"));

const queryClient = new QueryClient();

function RouteSeoDefaults() {
  const { pathname, search } = useLocation();
  const privateRoute = /^\/(admin|creator-dashboard|my-assets|login|auth)(\/|$)/.test(pathname);
  const filteredListing = pathname === "/assets" && Boolean(search);
  return <Seo
    title="Make Better — AI Assets Marketplace"
    description="Discover ready-to-use AI prompts, agents, workflows, playbooks, and templates built to save time and improve output."
    path={pathname}
    noindex={privateRoute || filteredListing}
  />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteSeoDefaults />
          <Suspense fallback={<main className="min-h-screen bg-[#050505] pt-24 text-center text-[#CFCFCF]" aria-live="polite">Loading page…</main>}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/asset/:slug" element={<AssetPage />} />
            <Route path="/creators" element={<CreatorsPage />} />
            <Route path="/creator/:slug" element={<CreatorPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:slug" element={<CollectionPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/privacy" element={<TrustPages page="privacy" />} />
            <Route path="/terms" element={<TrustPages page="terms" />} />
            <Route path="/contact" element={<TrustPages page="contact" />} />
            <Route path="/creator-guidelines" element={<TrustPages page="creator-guidelines" />} />
            <Route path="/payouts" element={<TrustPages page="payouts" />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/free-claim" element={<FreeClaimCallbackPage />} />
            <Route path="/creator-signup" element={<CreatorSignupPage />} />
            <Route path="/my-assets" element={<ProtectedRoute><MyAssetsPage /></ProtectedRoute>} />

            <Route path="/creator-dashboard" element={
              <ProtectedRoute roles={["creator"]}><CreatorDashboard /></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/submit-asset" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><SubmitAssetPage /></CreatorApprovalGate></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/assets/:slug/edit" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><EditAssetPage /></CreatorApprovalGate></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/blog/new" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><EditBlogPostPage /></CreatorApprovalGate></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/blog/:slug/edit" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><EditBlogPostPage /></CreatorApprovalGate></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/blog/:slug/preview" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><BlogPreviewPage audience="creator" /></CreatorApprovalGate></ProtectedRoute>
            } />

            <Route path="/admin" element={
              <AdminRoute><AdminDashboard /></AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute><AdminUsers /></AdminRoute>
            } />
            <Route path="/admin/creators" element={
              <AdminRoute><AdminCreators /></AdminRoute>
            } />
            <Route path="/admin/assets" element={
              <AdminRoute><AdminAssets /></AdminRoute>
            } />
            <Route path="/admin/requests" element={
              <AdminRoute><AdminAccessRequests /></AdminRoute>
            } />
            <Route path="/admin/blog" element={
              <AdminRoute><AdminBlog /></AdminRoute>
            } />
            <Route path="/admin/blog/:slug/preview" element={
              <AdminRoute><BlogPreviewPage audience="admin" /></AdminRoute>
            } />
            <Route path="/admin/collections" element={
              <AdminRoute><AdminCollections /></AdminRoute>
            } />

            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
