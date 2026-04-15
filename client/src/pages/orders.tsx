import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download } from "lucide-react";
import { Link } from "wouter";
import { StatusBadge } from "./dashboard";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/orders"] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = search === "" ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      const matchService = serviceFilter === "all" || o.serviceType === serviceFilter;
      return matchSearch && matchStatus && matchService;
    });
  }, [orders, search, statusFilter, serviceFilter]);

  const exportCSV = () => {
    const headers = "Order,Customer,Status,Service,Total,Date\n";
    const rows = filtered.map(o =>
      `${o.orderNumber},${o.customerName},${o.status},${o.serviceType},${o.total},${o.createdAt.split('T')[0]}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders or customers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-orders"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="at_vendor">At Vendor</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-service-filter">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Order #</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Customer</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Driver</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Vendor</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Service</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Total</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={8} className="py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No orders found</td></tr>
                ) : (
                  filtered.slice(0, 50).map((order: any) => (
                    <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link href={`/orders/${order.id}`} className="text-primary hover:underline font-medium" data-testid={`link-order-${order.id}`}>
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">{order.customerName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{order.driverName}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground text-xs">{order.vendorName}</td>
                      <td className="py-2.5 pr-3"><StatusBadge status={order.status} /></td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className="text-xs capitalize">{order.serviceType}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium">{formatCurrency(order.total)}</td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 50 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Showing 50 of {filtered.length} orders
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
