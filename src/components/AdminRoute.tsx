import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useStore } from "@/store/store";

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, authLoading } = useStore();

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
