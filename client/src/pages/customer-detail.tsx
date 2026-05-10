import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, CreditCard, Star, MessageSquare, AlertTriangle, ShoppingCart } from "lucide-react";
import { StatusBadge } from "./dashboard";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: customer, isLoading } = useQuery<any>({ queryKey: ["/api/customers", id] });
  const { data: customerOrders = [] } = useQuery<any[]>({ queryKey: ["/api/customers", id, "orders"] });
  const { data: comms = [] } = useQuery<any[]>({ queryKey: ["/api/customers", id, "communications"] });
  const [notes, setNotes] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", id] });
      toast({ title: "Customer updated" });
    },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!customer) return <div className="p-6 text-muted-foreground">Customer not found</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Link href="/customers">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge className="capitalize">{customer.tier}</Badge>
          <Badge variant={customer.status === "active" ? "default" : "secondary"} className="capitalize">{customer.status}</Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Spend</p>
          <p className="text-lg font-semibold">{formatCurrency(customer.totalSpend ?? customer.totalSpent ?? 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Orders</p>
          <p className="text-lg font-semibold">{customer.orderCount ?? customer.totalOrders ?? 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Loyalty Points</p>
          <p className="text-lg font-semibold">{(customer.loyaltyPoints ?? 0).toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Churn Risk</p>
          <div className="flex items-center gap-2">
            {customer.churnRisk > 0.4 && <AlertTriangle className="h-4 w-4 text-red-500" />}
            <p className={`text-lg font-semibold ${customer.churnRisk > 0.4 ? 'text-red-500' : customer.churnRisk > 0.2 ? 'text-yellow-500' : 'text-green-500'}`}>
              {((customer.churnRisk ?? 0) * 100).toFixed(0)}%
            </p>
          </div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" data-testid="tab-info">Info</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders ({customerOrders.length})</TabsTrigger>
          <TabsTrigger value="communications" data-testid="tab-communications">Communications</TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-muted-foreground text-xs">Phone</p><p>{customer.phone}</p></div>
                <div><p className="text-muted-foreground text-xs">Address</p><p>{customer.address}</p></div>
                <div><p className="text-muted-foreground text-xs">Zip Code</p><p>{customer.zipCode}</p></div>
                <div><p className="text-muted-foreground text-xs">Subscription</p><p className="capitalize">{customer.subscriptionType ?? customer.subscriptionTier ?? "None"}</p></div>
                <div><p className="text-muted-foreground text-xs">Joined</p><p>{(() => { const v = customer.createdAt ?? customer.memberSince; if (!v) return "—"; const d = new Date(v); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(); })()}</p></div>
                <div><p className="text-muted-foreground text-xs">Last Order</p><p>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : "Never"}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Order</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs text-right">Total</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerOrders.map((o: any) => (
                      <tr key={o.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <Link href={`/orders/${o.id}`} className="text-primary hover:underline">{o.orderNumber}</Link>
                        </td>
                        <td className="py-2 pr-3"><StatusBadge status={o.status} /></td>
                        <td className="py-2 pr-3 text-right font-medium">{formatCurrency(o.total)}</td>
                        <td className="py-2 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {customerOrders.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communications">
          <Card>
            <CardContent className="p-4 space-y-3">
              {comms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No communications yet</p>
              ) : comms.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{c.subject}</span>
                      <Badge variant="outline" className="text-xs capitalize">{c.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{c.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(c.sentAt).toLocaleString()} · {c.sentBy}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-4 space-y-3">
              {customer.notes && (
                <div className="p-3 rounded-lg bg-muted/30 text-sm">{customer.notes}</div>
              )}
              <Textarea
                placeholder="Add a note..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-customer-notes"
              />
              <Button
                size="sm"
                onClick={() => {
                  updateMutation.mutate({ notes: (customer.notes ? customer.notes + "\n" : "") + notes });
                  setNotes("");
                }}
                disabled={!notes.trim()}
                data-testid="button-save-notes"
              >
                Save Note
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
