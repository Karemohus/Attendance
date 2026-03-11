import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminDepartments from "@/pages/admin/departments";
import AdminLocations from "@/pages/admin/locations";
import AdminEmployees from "@/pages/admin/employees";
import AdminAttendance from "@/pages/admin/attendance";
import AdminSettings from "@/pages/admin/settings";
import AdminReports from "@/pages/admin/reports";
import SupervisorDashboard from "@/pages/supervisor/dashboard";
import SupervisorReports from "@/pages/supervisor/reports";
import EmployeeDashboard from "@/pages/employee/dashboard";
import EmployeeAttendance from "@/pages/employee/attendance";
import EmployeeQRCode from "@/pages/employee/qr-code";
import KioskPage from "@/pages/kiosk";
import ChangePasswordPage from "@/pages/change-password";
import { useAuth } from "./hooks/use-auth";

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.role === "admin") return <Redirect to="/admin" />;
  if (user.role === "supervisor") return <Redirect to="/supervisor" />;
  return <Redirect to="/employee" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Kiosk Route - No auth required */}
      <Route path="/kiosk/:departmentId" component={KioskPage} />
      
      {/* Force Password Change */}
      <ProtectedRoute path="/change-password" component={ChangePasswordPage} allowedRoles={["admin", "supervisor", "employee"]} />
      
      {/* Employee Routes - Employee only */}
      <ProtectedRoute path="/employee" component={EmployeeDashboard} allowedRoles={["employee"]} />
      <ProtectedRoute path="/employee/attendance" component={EmployeeAttendance} allowedRoles={["employee"]} />
      <ProtectedRoute path="/employee/qr-code" component={EmployeeQRCode} allowedRoles={["employee"]} />
      
      {/* Supervisor Routes - Supervisor only */}
      <ProtectedRoute path="/supervisor" component={SupervisorDashboard} allowedRoles={["supervisor"]} />
      <ProtectedRoute path="/supervisor/reports" component={SupervisorReports} allowedRoles={["supervisor"]} />
      
      {/* Admin Routes - Admin only */}
      <ProtectedRoute path="/admin" component={AdminDashboard} adminOnly />
      <ProtectedRoute path="/admin/departments" component={AdminDepartments} adminOnly />
      <ProtectedRoute path="/admin/locations" component={AdminLocations} adminOnly />
      <ProtectedRoute path="/admin/employees" component={AdminEmployees} adminOnly />
      <ProtectedRoute path="/admin/attendance" component={AdminAttendance} adminOnly />
      <ProtectedRoute path="/admin/settings" component={AdminSettings} adminOnly />
      <ProtectedRoute path="/admin/reports" component={AdminReports} adminOnly />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
