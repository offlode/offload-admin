import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPin, Clock, CheckCircle2, XCircle, PhoneCall } from "lucide-react";

type ServiceAreaRequest = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  requestedService?: string;
  requestedSpeed?: string;
  requestedOptions?: string;
  source?: string;
  status: "new" | "contacted" | "converted" | "closed";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  converted: { label: "Converted", variant: "outline" },
  closed: { label: "Closed", variant: "destructive" },
};

const STATE_FILTERS = ["All", "NJ", "NY", "Other"];

const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
};

export default function ServiceAreaRequestsPage() {
  const [stateFilter, setStateFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<ServiceAreaRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const queryUrl = (() => {
    const params = new URLSearchParams();
    if (stateFilter !== "All") {
      if (stateFilter === "Other") {
        // "Other" — handled client-side after fetch
      } else {
        params.set("state", stateFilter);
      }
    }
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "500");
    const q = params.toString();
    return q ? `/api/admin/service-area-requests?${q}` : "/api/admin/service-area-requests";
  })();

  const { data: rawRequests = [], isLoading } = useQuery<ServiceAreaRequest[]>({
    queryKey: [queryUrl],
  });

  // Client-side filter for "Other" state (not NJ or NY)
  const requests =
    stateFilter === "Other"
      ? rawRequests.filter((r) => r.state && r.state !== "NJ" && r.state !== "NY")
      : rawRequests;

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status?: string; notes?: string } }) => {
      const res = await apiRequest("PATCH", `/api/admin/service-area-requests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryUrl] });
      if (selectedRequest) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/service-area-requests"] });
      }
    },
  });

  const openDrawer = (req: ServiceAreaRequest) => {
    setSelectedRequest(req);
    setDrawerOpen(true);
  };

  // Stats
  const total = rawRequests.length;
  const newCount = rawRequests.filter((r) => r.status === "new").length;
  const contactedCount = rawRequests.filter((r) => r.status === "contacted").length;
  const convertedCount = rawRequests.filter((r) => r.status === "converted").length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Service Area Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            D4 leads — customers requesting service in new zip codes
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <MapPin className="h-3.5 w-3.5" /> Total leads
            </div>
            <p className="text-2xl font-semibold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" /> New
            </div>
            <p className="text-2xl font-semibold text-blue-500">{newCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <PhoneCall className="h-3.5 w-3.5 text-yellow-500" /> Contacted
            </div>
            <p className="text-2xl font-semibold text-yellow-500">{contactedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Converted
            </div>
            <p className="text-2xl font-semibold text-green-500">{convertedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* State filter */}
        <div className="flex gap-1 border rounded-md p-1">
          {STATE_FILTERS.map((s) => (
            <Button
              key={s}
              variant={stateFilter === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setStateFilter(s)}
              data-testid={`filter-state-${s}`}
            >
              {s}
            </Button>
          ))}
        </div>
        {/* Status filter */}
        <div className="flex gap-1 border rounded-md p-1">
          {(["all", "new", "contacted", "converted", "closed"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              data-testid={`filter-status-${s}`}
            >
              {s === "all" ? "All statuses" : (STATUS_CONFIG[s]?.label || s)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No requests match these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/30">
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">ID</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Submitted At</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Name</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Email</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Phone</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">ZIP</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Address</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">State</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Notes</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openDrawer(r)}
                      data-testid={`row-sar-${r.id}`}
                    >
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">#{r.id}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(r.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{r.name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.email || "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{r.phone || "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-mono">{r.zip || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">
                        {r.address || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.state || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">
                        {r.notes || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={STATUS_CONFIG[r.status]?.variant || "outline"}
                          className="text-xs"
                        >
                          {STATUS_CONFIG[r.status]?.label || r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openDrawer(r); }}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Service Area Request #{selectedRequest.id}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex gap-1">
                    {(["new", "contacted", "converted", "closed"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={selectedRequest.status === s ? "default" : "outline"}
                        className="text-xs"
                        disabled={updateMutation.isPending}
                        onClick={() => {
                          updateMutation.mutate(
                            { id: selectedRequest.id, data: { status: s } },
                            {
                              onSuccess: (updated) => {
                                setSelectedRequest(updated);
                              },
                            }
                          );
                        }}
                      >
                        {STATUS_CONFIG[s]?.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Contact info */}
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact Info
                  </p>
                  <Row label="Name" value={selectedRequest.name} />
                  <Row label="Email" value={selectedRequest.email} />
                  <Row label="Phone" value={selectedRequest.phone} />
                </div>

                {/* Location */}
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Location
                  </p>
                  <Row label="Address" value={selectedRequest.address} />
                  <Row label="City" value={selectedRequest.city} />
                  <Row label="State" value={selectedRequest.state} />
                  <Row label="ZIP" value={selectedRequest.zip} />
                  {selectedRequest.lat != null && (
                    <Row label="Coords" value={`${selectedRequest.lat}, ${selectedRequest.lng}`} />
                  )}
                </div>

                {/* Service preferences */}
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Service Preferences
                  </p>
                  <Row label="Service" value={selectedRequest.requestedService} />
                  <Row label="Speed" value={selectedRequest.requestedSpeed} />
                  <Row
                    label="Options"
                    value={
                      selectedRequest.requestedOptions
                        ? (() => {
                            try {
                              return JSON.parse(selectedRequest.requestedOptions).join(", ");
                            } catch {
                              return selectedRequest.requestedOptions;
                            }
                          })()
                        : undefined
                    }
                  />
                  <Row label="Source" value={selectedRequest.source} />
                </div>

                {/* Timestamps */}
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Timestamps
                  </p>
                  <Row label="Submitted" value={fmtDate(selectedRequest.createdAt)} />
                  <Row label="Updated" value={fmtDate(selectedRequest.updatedAt)} />
                </div>

                {/* Notes */}
                <div className="border rounded-md p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Internal Notes
                  </p>
                  <textarea
                    className="w-full text-sm bg-background border rounded-md p-2 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    defaultValue={selectedRequest.notes || ""}
                    placeholder="Add notes about this lead…"
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (selectedRequest.notes || "").trim()) {
                        updateMutation.mutate(
                          { id: selectedRequest.id, data: { notes: val } },
                          {
                            onSuccess: (updated) => {
                              setSelectedRequest(updated);
                            },
                          }
                        );
                      }
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Notes auto-save on blur (admin-only).
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setDrawerOpen(false)}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground shrink-0 w-20 text-xs">{label}</span>
      <span className="font-medium text-xs break-all">{value || "—"}</span>
    </div>
  );
}
