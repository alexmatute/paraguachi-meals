import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

/** Requires authentication. Redirects to /login if not logged in. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Requires active subscription. Redirects to /checkout if not subscribed. Admins bypass. */
export function RequireSubscription({ children }: { children: ReactNode }) {
  const { user, loading, subscribed, checkingSub, isAdmin, initialCheckDone } = useAuth();
  if (loading || (!initialCheckDone && checkingSub)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <>{children}</>;
  if (!subscribed) return <Navigate to="/checkout" replace />;
  return <>{children}</>;
}

/** Requires admin role. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
