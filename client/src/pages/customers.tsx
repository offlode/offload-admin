import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const tierColors: Record<string, string> = {
  standard: "secondary",
  silver: "secondary",
  gold: "default",
  platinum: "default",
};

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const filtered = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === "all" || c.tier === tierFilter;
      return matchSearch && matchTier;
    });
  }, [customers, search, tierFilter]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} total customers</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-customers"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-tier-filter">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Name</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Email</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Tier</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Total Spend</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Orders</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Churn Risk</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b"><td colSpan={7} className="py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No customers found</td></tr>
                ) : (
                  filtered.slice(0, 50).map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link href={`/customers/${c.id}`} className="text-primary hover:underline font-medium" data-testid={`link-customer-${c.id}`}>
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{c.email}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={tierColors[c.tier] as any || "secondary"} className="text-xs capitalize">{c.tier}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium">{formatCurrency(c.totalSpend)}</td>
                      <td className="py-2.5 pr-3 text-right">{c.orderCount}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          {c.churnRisk > 0.4 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.churnRisk > 0.4 ? 'bg-red-500' : c.churnRisk > 0.2 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${c.churnRisk * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{(c.churnRisk * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{c.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
