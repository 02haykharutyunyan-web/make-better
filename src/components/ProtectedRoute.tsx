import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { Role, useStore } from "@/store/store";

export default function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { user, authLoading } = useStore();
  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
