import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/store/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import CreatorApprovalGate from "@/components/CreatorApprovalGate";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AssetsPage from "./pages/Assets.tsx";
import AssetPage from "./pages/AssetPage.tsx";
import CreatorsPage from "./pages/CreatorsPage.tsx";
import CreatorPage from "./pages/CreatorPage.tsx";
import CollectionsPage from "./pages/CollectionsPage.tsx";
import CollectionPage from "./pages/CollectionPage.tsx";
import BlogPage from "./pages/BlogPage.tsx";
import BlogPostPage from "./pages/BlogPostPage.tsx";
import SubmitPage from "./pages/SubmitPage.tsx";

import LoginPage from "./pages/LoginPage.tsx";
import MyAssetsPage from "./pages/MyAssetsPage.tsx";
import CreatorSignupPage from "./pages/CreatorSignupPage.tsx";
import CreatorDashboard from "./pages/creator/CreatorDashboard.tsx";
import SubmitAssetPage from "./pages/creator/SubmitAssetPage.tsx";
import EditAssetPage from "./pages/creator/EditAssetPage.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminCreators from "./pages/admin/AdminCreators.tsx";
import AdminAssets from "./pages/admin/AdminAssets.tsx";
import AdminAccessRequests from "./pages/admin/AdminAccessRequests.tsx";
import AdminBlog from "./pages/admin/AdminBlog.tsx";
import AdminCollections from "./pages/admin/AdminCollections.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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

            <Route path="/login" element={<LoginPage />} />
            <Route path="/creator-signup" element={<CreatorSignupPage />} />
            <Route path="/my-assets" element={<MyAssetsPage />} />

            <Route path="/creator-dashboard" element={
              <ProtectedRoute roles={["creator"]}><CreatorDashboard /></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/submit-asset" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><SubmitAssetPage /></CreatorApprovalGate></ProtectedRoute>
            } />
            <Route path="/creator-dashboard/assets/:slug/edit" element={
              <ProtectedRoute roles={["creator"]}><CreatorApprovalGate><EditAssetPage /></CreatorApprovalGate></ProtectedRoute>
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
            <Route path="/admin/collections" element={
              <AdminRoute><AdminCollections /></AdminRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
