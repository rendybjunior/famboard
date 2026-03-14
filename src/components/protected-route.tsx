import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/types/database";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  requiredRole,
}: {
  requiredRole?: UserRole;
}) {
  const { session, membership, isLoading, membershipLoading } = useAuth();

  if (isLoading || membershipLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session || !membership) return <Navigate to="/login" replace />;
  if (requiredRole && membership.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
