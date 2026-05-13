import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ArrowLeft, Bot, User, Package, AlertTriangle } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: dispute, isLoading } = useQuery<any>({ queryKey: ["/api/disputes", id] });
  const [resolution, setResolution] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/disputes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disputes", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
      toast({ title: "Dispute updated" });
    },
  });

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!dispute) return <div className="p-6 text-muted-foreground">Dispute not found</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Link href="/disputes">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dispute #{dispute.id}</h1>
          <p className="text-sm text-muted-foreground capitalize">{dispute.type.replace(/_/g, " ")} · {dispute.status}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={dispute.priority === "critical" ? "destructive" : dispute.priority === "high" ? "default" : "secondary"} className="capitalize">
            {dispute.priority}
          </Badge>
          <Badge variant={dispute.status === "resolved" ? "secondary" : "destructive"} className="capitalize">{dispute.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dispute Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Dispute Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Description</p>
              <p>{dispute.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-xs">Customer</p>
                <Link href={`/customers/${dispute.customerId}`} className="text-primary hover:underline">{dispute.customerName}</Link>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Order</p>
                <Link href={`/orders/${dispute.orderId}`} className="text-primary hover:underline">{dispute.orderNumber}</Link>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Filed</p>
                <p>{new Date(dispute.createdAt).toLocaleString()}</p>
              </div>
              {dispute.resolvedAt && (
                <div>
                  <p className="text-muted-foreground text-xs">Resolved</p>
                  <p>{new Date(dispute.resolvedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
            {dispute.resolution && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs">Resolution</p>
                <p className="capitalize">{dispute.resolution.replace(/_/g, " ")} — {formatCurrency(dispute.resolutionAmount || 0)}</p>
                {dispute.resolutionNote && <p className="text-xs text-muted-foreground mt-1">{dispute.resolutionNote}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis card removed — dispute.aiSuggestion / aiConfidence are not populated by any backend route (P17 audit) */}
      </div>

      {/* Resolution Workflow */}
      {dispute.status !== "resolved" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateMutation.mutate({ status: "investigating" })}
                disabled={dispute.status === "investigating"}
                data-testid="button-investigate"
              >
                Mark Investigating
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateMutation.mutate({ status: "escalated" })}
                data-testid="button-escalate"
              >
                Escalate
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Resolution Type</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger data-testid="select-resolution"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="refund">Full Refund</SelectItem>
                    <SelectItem value="partial_refund">Partial Refund</SelectItem>
                    <SelectItem value="deny">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount ($)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} data-testid="input-resolution-amount" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Note</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note..." data-testid="input-resolution-note" />
              </div>
            </div>
            <Button
              onClick={() => {
                updateMutation.mutate({
                  status: "resolved",
                  resolution,
                  resolutionAmount: parseFloat(amount) || 0,
                  resolutionNote: note,
                  resolvedAt: new Date().toISOString(),
                });
              }}
              disabled={!resolution}
              data-testid="button-resolve"
            >
              Resolve Dispute
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
