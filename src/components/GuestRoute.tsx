import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isProfileComplete } from "@/services/profile";

/** Redirects authenticated users away from signup/login pages */
export default function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && profile) {
    // Admin roles go to admin panel
    if (["admin", "editor", "viewer"].includes(profile.role)) {
      return <Navigate to="/admin" replace />;
    }
    if (!isProfileComplete(profile)) {
      return <Navigate to="/onboarding" replace />;
    }
    // Redirect based on role
    if (profile.role === "provider") return <Navigate to="/dashboard/provider" replace />;
    return <Navigate to="/dashboard/seeker" replace />;
  }

  return <>{children}</>;
}
