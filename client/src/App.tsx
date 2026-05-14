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
import NotFound from "@/pages/not-found";

// Role-based app imports
import { ManagerDashboard, ManagerOrders, ManagerOrderDetail, ManagerBanking, ManagerBonuses, ManagerEmployees, ManagerSecurity, ManagerCertified } from "@/features/manager";
import { DriverDashboard, DriverPickup, DriverDelivery, DriverVehicle } from "@/features/driver";
import { OperatorDashboard, OperatorQueue, OperatorWashRun } from "@/features/operator";

function AdminRouter() {
  return (
    <Switch>
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
      {/* Admin can also access manager/driver/operator routes */}
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/manager/orders" component={ManagerOrders} />
      <Route path="/manager/orders/:id" component={ManagerOrderDetail} />
      <Route path="/manager/banking" component={ManagerBanking} />
      <Route path="/manager/bonuses" component={ManagerBonuses} />
      <Route path="/manager/employees" component={ManagerEmployees} />
      <Route path="/manager/security" component={ManagerSecurity} />
      <Route path="/manager/certified" component={ManagerCertified} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/orders/:id/pickup" component={DriverPickup} />
      <Route path="/driver/orders/:id/delivery" component={DriverDelivery} />
      <Route path="/driver/profile/vehicle" component={DriverVehicle} />
      <Route path="/operator" component={OperatorDashboard} />
      <Route path="/operator/queue" component={OperatorQueue} />
      <Route path="/operator/orders/:id" component={OperatorWashRun} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ManagerRouter() {
  return (
    <Switch>
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/manager/orders" component={ManagerOrders} />
      <Route path="/manager/orders/:id" component={ManagerOrderDetail} />
      <Route path="/manager/banking" component={ManagerBanking} />
      <Route path="/manager/bonuses" component={ManagerBonuses} />
      <Route path="/manager/employees" component={ManagerEmployees} />
      <Route path="/manager/security" component={ManagerSecurity} />
      <Route path="/manager/certified" component={ManagerCertified} />
      <Route path="/">{() => <Redirect to="/manager" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

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

function OperatorRouter() {
  return (
    <Switch>
      <Route path="/operator" component={OperatorDashboard} />
      <Route path="/operator/queue" component={OperatorQueue} />
      <Route path="/operator/orders/:id" component={OperatorWashRun} />
      <Route path="/">{() => <Redirect to="/operator" />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return null;

  switch (user.role) {
    case "admin":
      return <AdminRouter />;
    case "manager":
    case "laundromat":
      return <ManagerRouter />;
    case "driver":
      return <DriverRouter />;
    case "operator":
    case "wash_operator":
      return <OperatorRouter />;
    default:
      return <NotFound />;
  }
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  // Reset-password page is accessible without auth
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  if (hash.startsWith("#/reset-password")) {
    return <ResetPasswordPage />;
  }

  if (loading) return null;

  // Public routes accessible without login
  if (!user) {
    const hash = window.location.hash;
    if (hash.startsWith("#/forgot-password")) return <ForgotPasswordPage />;
    if (hash.startsWith("#/reset-password")) return <ResetPasswordPage />;
    return <LoginPage />;
  }

  // For non-admin roles, render without the admin sidebar
  const isAdminRole = user.role === "admin";

  if (!isAdminRole) {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30" style={{borderTop: '2px solid hsl(var(--primary))'}}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">OFFLOAD</span>
            <span className="text-xs text-muted-foreground capitalize">{user.role.replace("_", " ")}</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <RoleRouter />
        </main>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30" style={{borderTop: '2px solid hsl(var(--primary))'}}>
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <RoleRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
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
