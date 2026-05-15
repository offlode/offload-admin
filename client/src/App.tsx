import { Switch, Route, Router, Redirect } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, ThemeToggle } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

// Existing admin pages (used by super_admin)
import Dashboard from "@/pages/dashboard";
import OrdersPage from "@/pages/orders";
import OrderDetailPage from "@/pages/order-detail";
import CustomersPage from "@/pages/customers";
import CustomerDetailPage from "@/pages/customer-detail";
import DriversPage from "@/pages/drivers";
import DriverDetailPage from "@/pages/driver-detail";
import VendorsPage from "@/pages/vendors";
import VendorDetailPage from "@/pages/vendor-detail";
import FinancialPage from "@/pages/financial";
import DisputesPage from "@/pages/disputes";
import DisputeDetailPage from "@/pages/dispute-detail";
import PromosPage from "@/pages/promos";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";
import NotificationRulesPage from "@/pages/notification-rules";
import AddOnPricingPage from "@/pages/add-on-pricing";
import ApplicationsPage from "@/pages/applications";
import ApplicationDetailPage from "@/pages/application-detail";
import PricingConfigPage from "@/pages/pricing-config";
import SupportPage from "@/pages/support";
import StripeReconciliationPage from "@/pages/stripe-reconciliation";
import ServiceAreasPage from "@/pages/service-areas";
import ServiceAreaRequestsPage from "@/pages/service-area-requests";
import QACenterPage from "@/pages/qa-center";

// Existing role-based components
import { DriverDashboard, DriverPickup, DriverDelivery, DriverVehicle } from "@/features/driver";

// New role-gated features
import SuperDashboard from "@/features/super/SuperDashboard";
import SuperPricing from "@/features/super/SuperPricing";
import SuperLaundromats from "@/features/super/SuperLaundromats";
import SuperLaundromatNew from "@/features/super/SuperLaundromatNew";
import SuperUsers from "@/features/super/SuperUsers";
import OwnerDashboard from "@/features/owner/OwnerDashboard";
import OwnerIncoming from "@/features/owner/OwnerIncoming";
import OwnerOrders from "@/features/owner/OwnerOrders";
import OwnerOrderDetail from "@/features/owner/OwnerOrderDetail";
import OwnerEmployees from "@/features/owner/OwnerEmployees";
import OwnerSettings from "@/features/owner/OwnerSettings";
import StaffQueue from "@/features/staff/StaffQueue";
import StaffOrderDetail from "@/features/staff/StaffOrderDetail";

// ─── Super Admin Router ───
function SuperAdminRouter() {
  return (
    <Switch>
      <Route path="/super/dashboard" component={SuperDashboard} />
      <Route path="/super/pricing" component={SuperPricing} />
      <Route path="/super/laundromats" component={SuperLaundromats} />
      <Route path="/super/laundromats/new" component={SuperLaundromatNew} />
      <Route path="/super/users" component={SuperUsers} />
      <Route path="/super/orders" component={OrdersPage} />
      <Route path="/super/orders/:id" component={OrderDetailPage} />
      <Route path="/super/drivers" component={DriversPage} />
      <Route path="/super/drivers/:id" component={DriverDetailPage} />
      {/* Legacy admin routes for backward compat */}
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/orders/:id" component={OrderDetailPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/customers/:id" component={CustomerDetailPage} />
      <Route path="/drivers" component={DriversPage} />
      <Route path="/drivers/:id" component={DriverDetailPage} />
      <Route path="/vendors" component={VendorsPage} />
      <Route path="/vendors/:id" component={VendorDetailPage} />
      <Route path="/financial" component={FinancialPage} />
      <Route path="/disputes" component={DisputesPage} />
      <Route path="/disputes/:id" component={DisputeDetailPage} />
      <Route path="/promos" component={PromosPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/notification-rules" component={NotificationRulesPage} />
      <Route path="/add-ons" component={AddOnPricingPage} />
      <Route path="/applications" component={ApplicationsPage} />
      <Route path="/applications/:id" component={ApplicationDetailPage} />
      <Route path="/pricing-config" component={PricingConfigPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/reconciliation" component={StripeReconciliationPage} />
      <Route path="/service-areas" component={ServiceAreasPage} />
      <Route path="/service-area-requests" component={ServiceAreaRequestsPage} />
      <Route path="/qa-center" component={QACenterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Owner Router ───
function OwnerRouter() {
  return (
    <Switch>
      <Route path="/owner/dashboard" component={OwnerDashboard} />
      <Route path="/owner/incoming" component={OwnerIncoming} />
      <Route path="/owner/orders" component={OwnerOrders} />
      <Route path="/owner/orders/:id" component={OwnerOrderDetail} />
      <Route path="/owner/employees" component={OwnerEmployees} />
      <Route path="/owner/settings" component={OwnerSettings} />
      <Route path="/">{() => <Redirect to="/owner/dashboard" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Staff Router ───
function StaffRouter() {
  return (
    <Switch>
      <Route path="/staff/queue" component={StaffQueue} />
      <Route path="/staff/order/:id" component={StaffOrderDetail} />
      <Route path="/">{() => <Redirect to="/staff/queue" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Driver Router ───
function DriverRouter() {
  return (
    <Switch>
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/orders/:id/pickup" component={DriverPickup} />
      <Route path="/driver/orders/:id/delivery" component={DriverDelivery} />
      <Route path="/driver/profile/vehicle" component={DriverVehicle} />
      <Route path="/">{() => <Redirect to="/driver" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case "super_admin":
    case "admin":
      return <SuperAdminRouter />;
    case "laundromat_owner":
    case "manager":
    case "laundromat":
      return <OwnerRouter />;
    case "laundromat_employee":
    case "operator":
    case "wash_operator":
      return <StaffRouter />;
    case "driver":
      return <DriverRouter />;
    default:
      return <NotFound />;
  }
}

// ─── Role-specific Navigation ───
function RoleNav({ role }: { role: string }) {
  const navItems: Record<string, Array<{ label: string; href: string }>> = {
    super_admin: [
      { label: "Dashboard", href: "#/super/dashboard" },
      { label: "Pricing", href: "#/super/pricing" },
      { label: "Laundromats", href: "#/super/laundromats" },
      { label: "Users", href: "#/super/users" },
      { label: "Orders", href: "#/super/orders" },
      { label: "Drivers", href: "#/super/drivers" },
    ],
    admin: [
      { label: "Dashboard", href: "#/super/dashboard" },
      { label: "Pricing", href: "#/super/pricing" },
      { label: "Laundromats", href: "#/super/laundromats" },
      { label: "Users", href: "#/super/users" },
      { label: "Orders", href: "#/super/orders" },
      { label: "Drivers", href: "#/super/drivers" },
    ],
    laundromat_owner: [
      { label: "Dashboard", href: "#/owner/dashboard" },
      { label: "Incoming", href: "#/owner/incoming" },
      { label: "Orders", href: "#/owner/orders" },
      { label: "Employees", href: "#/owner/employees" },
      { label: "Settings", href: "#/owner/settings" },
    ],
    manager: [
      { label: "Dashboard", href: "#/owner/dashboard" },
      { label: "Incoming", href: "#/owner/incoming" },
      { label: "Orders", href: "#/owner/orders" },
      { label: "Employees", href: "#/owner/employees" },
      { label: "Settings", href: "#/owner/settings" },
    ],
    laundromat_employee: [
      { label: "Queue", href: "#/staff/queue" },
    ],
    operator: [
      { label: "Queue", href: "#/staff/queue" },
    ],
    driver: [
      { label: "Dashboard", href: "#/driver" },
    ],
  };

  const items = navItems[role] || [];
  const currentHash = typeof window !== "undefined" ? window.location.hash : "";

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {items.map((item) => {
        const active = currentHash === item.href || currentHash.startsWith(item.href.replace("#", "#") + "/");
        return (
          <a
            key={item.href}
            href={item.href}
            className={`px-3 py-1 text-sm rounded-md whitespace-nowrap transition-colors ${
              active
                ? "bg-[#5B4BC4]/10 text-[#5B4BC4] font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function AuthenticatedApp() {
  const { user, loading, logout } = useAuth();

  // Reset-password page is accessible without auth
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  if (hash.startsWith("#/reset-password")) {
    return <ResetPasswordPage />;
  }

  if (loading) return null;

  // Public routes accessible without login
  if (!user) {
    const h = window.location.hash;
    if (h.startsWith("#/forgot-password")) return <ForgotPasswordPage />;
    if (h.startsWith("#/reset-password")) return <ResetPasswordPage />;
    return <LoginPage />;
  }

  // Super admin uses the sidebar layout
  const isSuperAdmin = user.role === "super_admin" || user.role === "admin";

  if (isSuperAdmin) {
    const style = {
      "--sidebar-width": "16rem",
      "--sidebar-width-icon": "3rem",
    };

    return (
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30" style={{ borderTop: "3px solid #5B4BC4" }}>
              <div className="flex items-center gap-3">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <RoleNav role={user.role} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {user.name}
                </span>
                <ThemeToggle />
                <button
                  onClick={logout}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                >
                  Logout
                </button>
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <RoleRouter />
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // All other roles: simple header layout
  const roleLabels: Record<string, string> = {
    laundromat_owner: "Owner",
    manager: "Manager",
    laundromat_employee: "Staff",
    operator: "Operator",
    driver: "Driver",
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30" style={{ borderTop: "3px solid #5B4BC4" }}>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold" style={{ color: "#5B4BC4" }}>OFFLOAD</span>
          <span className="text-xs bg-[#5B4BC4]/10 text-[#5B4BC4] px-2 py-0.5 rounded-full font-medium">
            {roleLabels[user.role] || user.role.replace(/_/g, " ")}
          </span>
          <RoleNav role={user.role} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {user.name}
          </span>
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto">
        <RoleRouter />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router hook={useHashLocation}>
              <AuthenticatedApp />
            </Router>
          </AuthProvider>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
