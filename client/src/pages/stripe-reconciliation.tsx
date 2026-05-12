import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Clock, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, API_BASE } from "@/lib/queryClient";

interface ReconEntry {
  id: number;
  stripe_event_id: string | null;
  stripe_resource_id: string | null;
  action: string;
  db_state: string;
  error_message: string | null;
  recorded_at: string;
  resolved_at: string | null;
  notes: string | null;
}

interface ReconResponse {
  entries: ReconEntry[];
  page: number;
  limit: number;
  total: number;
}

export default function StripeReconciliationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const { data, isLoading } = useQuery<ReconResponse>({
    queryKey: ["/api/admin/stripe-reconciliation", page, showResolved],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/admin/stripe-reconciliation?page=${page}&limit=25&resolved=${showResolved}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch reconciliation entries");
      return res.json();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const res = await apiRequest("POST", `/api/admin/stripe-reconciliation/${id}/resolve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stripe-reconciliation"] });
      setSelectedId(null);
      setResolveNotes("");
      toast({ title: "Entry resolved", description: "Reconciliation entry marked as resolved." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to resolve", description: err.message, variant: "destructive" });
    },
  });

  const entries = data?.entries || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 25);
  const selected = entries.find((e) => e.id === selectedId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Stripe Reconciliation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and resolve Stripe/database divergence incidents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showResolved ? "secondary" : "outline"}
            size="sm"
            onClick={() => { setShowResolved(!showResolved); setPage(1); }}
          >
            {showResolved ? "Hide Resolved" : "Show Resolved"}
          </Button>
          <Badge variant="secondary" className="text-xs">
            {total} {showResolved ? "total" : "unresolved"}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </Card>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-medium">No {showResolved ? "" : "unresolved "}reconciliation entries</p>
          <p className="text-muted-foreground text-sm mt-1">
            All Stripe/database transactions are in sync.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card
              key={entry.id}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                selectedId === entry.id ? "border-primary bg-accent" : ""
              }`}
              onClick={() => setSelectedId(entry.id === selectedId ? null : entry.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-sm">{entry.action}</span>
                      <Badge variant="outline" className="text-[10px]">#{entry.id}</Badge>
                    </div>
                    {entry.stripe_event_id && (
                      <p className="text-xs text-muted-foreground">
                        Event: <code className="bg-muted px-1 rounded">{entry.stripe_event_id}</code>
                      </p>
                    )}
                    {entry.stripe_resource_id && (
                      <p className="text-xs text-muted-foreground">
                        Resource: <code className="bg-muted px-1 rounded">{entry.stripe_resource_id}</code>
                      </p>
                    )}
                    {entry.error_message && (
                      <p className="text-xs text-red-500 mt-1">{entry.error_message}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <Badge
                      variant={entry.resolved_at ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {entry.resolved_at ? "Resolved" : "Unresolved"}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(entry.recorded_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedId === entry.id && (
                  <div className="mt-4 pt-3 border-t space-y-3">
                    <div>
                      <p className="text-xs font-medium mb-1">DB State Snapshot:</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {(() => {
                          try { return JSON.stringify(JSON.parse(entry.db_state), null, 2); }
                          catch { return entry.db_state; }
                        })()}
                      </pre>
                    </div>
                    {entry.notes && (
                      <div>
                        <p className="text-xs font-medium mb-1">Notes:</p>
                        <p className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">{entry.notes}</p>
                      </div>
                    )}
                    {entry.resolved_at && (
                      <p className="text-xs text-muted-foreground">
                        Resolved at: {new Date(entry.resolved_at).toLocaleString()}
                      </p>
                    )}
                    {!entry.resolved_at && (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Textarea
                            placeholder="Resolution notes (optional)..."
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            className="min-h-[50px] resize-none text-xs"
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={resolveMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveMutation.mutate({ id: entry.id, notes: resolveNotes || undefined });
                          }}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
