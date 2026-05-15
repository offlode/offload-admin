import {
  LayoutDashboard, ShoppingCart, Users, Truck, Store,
  DollarSign, AlertTriangle, Tag, BarChart3, Settings, LogOut, Bell, Sparkles,
  ClipboardList, MessageCircle, FileText, MapPin, ClipboardCheck,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Drivers", url: "/drivers", icon: Truck },
  { title: "Vendors", url: "/vendors", icon: Store },
  { title: "Service Areas", url: "/service-areas", icon: MapPin },
  { title: "Area Requests", url: "/service-area-requests", icon: MapPin },
  { title: "Applications", url: "/applications", icon: ClipboardList, badgeKey: "applications" },
  { title: "Financial", url: "/financial", icon: DollarSign },
  { title: "Support", url: "/support", icon: MessageCircle },
  { title: "Reconciliation", url: "/reconciliation", icon: FileText },
  { title: "Disputes", url: "/disputes", icon: AlertTriangle },
  { title: "Promos & Loyalty", url: "/promos", icon: Tag },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Notification Rules", url: "/notification-rules", icon: Bell },
  { title: "Add-on Pricing", url: "/add-ons", icon: Sparkles },
  { title: "Pricing Config", url: "/pricing-config", icon: DollarSign },
  { title: "QA Center", url: "/qa-center", icon: ClipboardCheck },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: appStats } = useQuery<any>({
    queryKey: ["/api/admin/partner-applications/stats/summary"],
    refetchInterval: 60000,
  });
  const pendingCount = (appStats?.pending || 0) + (appStats?.autoFlagged || 0);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-label="Offload logo">
            <circle cx="18" cy="18" r="16" stroke="#5B4BC4" strokeWidth="2.5" />
            <path d="M12 18c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="#5B4BC4" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="18" cy="18" r="2" fill="#5B4BC4" />
          </svg>
          <span className="font-semibold text-sm tracking-tight">Offload Admin</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.url === "/"
                  ? location === "/" || location === ""
                  : location.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {(item as any).badgeKey === "applications" && pendingCount > 0 && (
                          <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {user?.name?.split(' ').map(n => n[0]).join('') || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
