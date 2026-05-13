import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ServiceAreaRequest = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  requestedService?: string;
  requestedSpeed?: string;
  requestedOptions?: string;
  source?: string;
  status: "new" | "contacted" | "converted" | "closed";
  notes?: string;
  createdAt: string;
};

type DemandByZip = {
  zip: string;
  city: string;
  state: string;
  count: number;
  lastRequestedAt: string;
};

const statusBadge: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  converted: { label: "Converted", variant: "outline" },
  closed: { label: "Closed", variant: "destructive" },
};

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function LeadRequestRow({
  req,
  onSaved,
}: {
  req: ServiceAreaRequest;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [localNotes, setLocalNotes] = useState(req.notes ?? "");
  const [notesChanged, setNotesChanged] = useState(false);

  const patchMutation = useMutation({
    mutationFn: (data: { status?: string; notes?: string }) =>
      apiRequest("PATCH", `/api/admin/service-area-requests/${req.id}`, data),
    onSuccess: () => {
      onSaved();
      setNotesChanged(false);
      toast({ title: "Lead updated" });
    },
    onError: () => {
      toast({ title: "Failed to update lead", variant: "destructive" });
    },
  });

  return (
    <tr
      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
      data-testid={`row-service-area-request-${req.id}`}
    >
      <td className="px-3 py-2.5">
        <p className="font-medium">{req.name}</p>
        <p className="text-xs text-muted-foreground">{req.email}</p>
        {req.phone && <p className="text-xs text-muted-foreground">{req.phone}</p>}
      </td>
      <td className="px-3 py-2.5 text-sm">
        <p>{req.address}</p>
        <p className="text-xs text-muted-foreground">
          {req.city}, {req.state} {req.zip}
        </p>
      </td>
      <td className="px-3 py-2.5 text-sm">
        {req.requestedService && (
          <p className="capitalize">{req.requestedService}</p>
        )}
        {req.requestedSpeed && (
          <p className="text-xs text-muted-foreground capitalize">
            {req.requestedSpeed}
          </p>
        )}
      </td>
      <td className="px-3 py-2.5">
        <Select
          value={req.status}
          onValueChange={(val) => patchMutation.mutate({ status: val })}
          disabled={patchMutation.isPending}
        >
          <SelectTrigger className="w-32 h-7 text-xs" data-testid={`select-status-${req.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2.5 min-w-[180px]">
        <div className="flex gap-1.5 items-start">
          <Textarea
            className="text-xs resize-none h-14 min-h-0"
            placeholder="Add notes…"
            value={localNotes}
            onChange={(e) => {
              setLocalNotes(e.target.value);
              setNotesChanged(e.target.value !== (req.notes ?? ""));
            }}
            data-testid={`textarea-notes-${req.id}`}
          />
          {notesChanged && (
            <Button
              size="sm"
              className="h-7 text-xs shrink-0"
              disabled={patchMutation.isPending}
              onClick={() => patchMutation.mutate({ notes: localNotes })}
              data-testid={`button-save-notes-${req.id}`}
            >
              Save
            </Button>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
        {fmtDate(req.createdAt)}
      </td>
    </tr>
  );
}

export default function ServiceAreasPage() {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "new" | "contacted" | "converted" | "closed"
  >("all");

  const queryUrl =
    statusFilter !== "all"
      ? `/api/admin/service-area-requests?status=${statusFilter}`
      : "/api/admin/service-area-requests";

  const {
    data: leads = [],
    isLoading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery<ServiceAreaRequest[]>({ queryKey: [queryUrl] });

  const { data: demand = [], isLoading: demandLoading } = useQuery<
    DemandByZip[]
  >({ queryKey: ["/api/admin/service-area-requests/demand"] });

  const sortedDemand = [...demand].sort((a, b) => b.count - a.count);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Service Area Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Leads from prospective customers in uncovered areas
          </p>
        </div>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads" data-testid="tab-leads">
            Lead Requests
          </TabsTrigger>
          <TabsTrigger value="demand" data-testid="tab-demand">
            Demand by ZIP
          </TabsTrigger>
        </TabsList>

        {/* Lead Requests Tab */}
        <TabsContent value="leads" className="space-y-3 mt-4">
          {/* Status filter */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 border rounded-md p-1">
              {(
                [
                  "all",
                  "new",
                  "contacted",
                  "converted",
                  "closed",
                ] as const
              ).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  data-testid={`filter-status-${s}`}
                >
                  {s === "all" ? "All" : (statusBadge[s]?.label ?? s)}
                </Button>
              ))}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {leadsLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No leads match these filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left bg-muted/30">
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Name
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Address
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Service
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Status
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Notes
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((req) => (
                        <LeadRequestRow
                          key={req.id}
                          req={req}
                          onSaved={() => {
                            queryClient.invalidateQueries({ queryKey: [queryUrl] });
                            refetchLeads();
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demand by ZIP Tab */}
        <TabsContent value="demand" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {demandLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : sortedDemand.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No demand data yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left bg-muted/30">
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          ZIP
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          City
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          State
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs flex items-center gap-1">
                          <ArrowUpDown className="h-3 w-3" /> Requests
                        </th>
                        <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">
                          Last Requested
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDemand.map((row) => (
                        <tr
                          key={row.zip}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          data-testid={`row-demand-${row.zip}`}
                        >
                          <td className="px-3 py-2.5 font-mono font-medium">
                            {row.zip}
                          </td>
                          <td className="px-3 py-2.5">{row.city}</td>
                          <td className="px-3 py-2.5">{row.state}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant="secondary">{row.count}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {fmtDate(row.lastRequestedAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
