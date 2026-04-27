import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ClipboardList, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

type Application = {
  id: number;
  applicantType: "driver" | "laundromat";
  status: "pending_review" | "auto_flagged" | "approved" | "declined";
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  businessName?: string;
  vehicleType?: string;
  autoScreenScore?: number;
  autoScreenRecommendation?: "approve" | "review" | "decline";
  autoScreenFlags?: string;
  createdAt: string;
};

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending_review: { label: "Pending", variant: "default" },
  auto_flagged: { label: "Flagged", variant: "secondary" },
  approved: { label: "Approved", variant: "outline" },
  declined: { label: "Declined", variant: "destructive" },
};

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<"all" | "pending_review" | "auto_flagged" | "approved" | "declined">("all");
  const [type, setType] = useState<"all" | "driver" | "laundromat">("all");

  const { data: stats } = useQuery<any>({ queryKey: ["/api/admin/partner-applications/stats/summary"] });
  const queryUrl = (() => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (type !== "all") params.set("applicantType", type);
    const q = params.toString();
    return q ? `/api/admin/partner-applications?${q}` : "/api/admin/partner-applications";
  })();
  const { data: apps = [], isLoading } = useQuery<Application[]>({ queryKey: [queryUrl] });

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return s; }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Partner Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Driver and laundromat partner sign-ups requiring review
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" /> Pending review
            </div>
            <p className="text-2xl font-semibold">{stats?.pending ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" /> Auto-flagged
            </div>
            <p className="text-2xl font-semibold text-yellow-500">{stats?.autoFlagged ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Approved
            </div>
            <p className="text-2xl font-semibold text-green-500">{stats?.approved ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <XCircle className="h-3.5 w-3.5 text-muted-foreground" /> Declined
            </div>
            <p className="text-2xl font-semibold text-muted-foreground">{stats?.declined ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 border rounded-md p-1">
          {(["all","pending_review","auto_flagged","approved","declined"] as const).map(s => (
            <Button
              key={s}
              variant={filter === s ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(s)}
              data-testid={`filter-status-${s}`}
            >
              {s === "all" ? "All" : (statusBadge[s]?.label || s)}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 border rounded-md p-1">
          {(["all","driver","laundromat"] as const).map(t => (
            <Button
              key={t}
              variant={type === t ? "default" : "ghost"}
              size="sm"
              onClick={() => setType(t)}
              data-testid={`filter-type-${t}`}
            >
              {t === "all" ? "All types" : (t.charAt(0).toUpperCase() + t.slice(1))}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : apps.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No applications match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/30">
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Applicant</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Type</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Auto-screen</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs">Submitted</th>
                    <th className="px-3 py-2.5 font-medium text-muted-foreground text-xs"></th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(a => {
                    const flagsArr: string[] = (() => { try { return a.autoScreenFlags ? JSON.parse(a.autoScreenFlags) : []; } catch { return []; } })();
                    return (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-application-${a.id}`}>
                        <td className="px-3 py-2.5">
                          <p className="font-medium">{a.fullName}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                          {a.businessName && <p className="text-xs">{a.businessName}</p>}
                        </td>
                        <td className="px-3 py-2.5 capitalize">{a.applicantType}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={statusBadge[a.status]?.variant || "outline"} className="text-xs">
                            {statusBadge[a.status]?.label || a.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium text-xs ${(a.autoScreenScore || 0) >= 85 ? "text-green-500" : (a.autoScreenScore || 0) >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                              {a.autoScreenScore ?? "—"}/100
                            </span>
                            {flagsArr.length > 0 && <Badge variant="secondary" className="text-[10px]">{flagsArr.length} flag{flagsArr.length > 1 ? "s" : ""}</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(a.createdAt)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <Link href={`/applications/${a.id}`} data-testid={`link-application-${a.id}`}>
                            <Button size="sm" variant="outline">Review</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
