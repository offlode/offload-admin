import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { DISPUTE_STATUS_COLORS, DISPUTE_PRIORITY_COLORS } from "@/features/shared/constants";

export default function DisputesPage() {
  const { data: disputes = [] } = useQuery<any[]>({ queryKey: ["/api/disputes"] });

  const open = disputes.filter(d => d.status === "open");
  const investigating = disputes.filter(d => d.status === "investigating");
  const escalated = disputes.filter(d => d.status === "escalated");
  const resolved = disputes.filter(d => d.status === "resolved");

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Disputes & Support</h1>
        <p className="text-sm text-muted-foreground">{disputes.length} total disputes</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Open</p>
          <p className="text-lg font-semibold text-red-500">{open.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Investigating</p>
          <p className="text-lg font-semibold text-yellow-500">{investigating.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Escalated</p>
          <p className="text-lg font-semibold text-orange-500">{escalated.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Resolved</p>
          <p className="text-lg font-semibold text-green-500">{resolved.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">ID</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Order</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Customer</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Type</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Priority</th>
                  <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="pb-2 font-medium text-muted-foreground text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d: any) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      <Link href={`/disputes/${d.id}`} className="text-primary hover:underline font-medium" data-testid={`link-dispute-${d.id}`}>
                        #{d.id}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{d.orderNumber}</td>
                    <td className="py-2.5 pr-3">{d.customerName}</td>
                    <td className="py-2.5 pr-3">
                      <Badge variant="outline" className="text-xs capitalize">{d.type.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={DISPUTE_PRIORITY_COLORS[d.priority] as any} className="text-xs capitalize">{d.priority}</Badge>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge variant={DISPUTE_STATUS_COLORS[d.status] as any} className="text-xs capitalize">{d.status}</Badge>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
