import { Switch, Route, Router } from "wouter";
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
import NotFound from "@/pages/not-found";

function AppRouter() {
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
      <Route component={NotFound} />
    </Switch>
  );
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

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <AppRouter />
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
