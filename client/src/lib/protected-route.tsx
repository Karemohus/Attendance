import { useAuth } from "@/hooks/use-auth";
import { Route, Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

type AllowedRole = "admin" | "supervisor" | "employee";

export function ProtectedRoute({ 
  component: Component, 
  adminOnly = false,
  allowedRoles,
  path 
}: { 
  component: React.ComponentType<any>; 
  adminOnly?: boolean;
  allowedRoles?: AllowedRole[];
  path: string;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // إذا تم تحديد أدوار معينة
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role as AllowedRole)) {
      // توجيه للصفحة المناسبة حسب الدور
      if (user.role === "admin") return <Redirect to="/admin" />;
      if (user.role === "supervisor") return <Redirect to="/supervisor" />;
      return <Redirect to="/employee" />;
    }
  }

  // للتوافق مع الكود القديم
  if (adminOnly && user.role !== "admin") {
    if (user.role === "supervisor") return <Redirect to="/supervisor" />;
    return <Redirect to="/employee" />;
  }

  return <Route path={path} component={Component} />;
}
