import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, CheckCircle, XCircle, MapPin } from "lucide-react";
import { SkeletonList } from "@/features/shared/components";

interface Laundromat {
  id: string;
  name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  certified: boolean;
  active: boolean;
  service_radius_miles: number;
  capacity_bags_per_day: number;
  owner_user_id: number | null;
}

export default function SuperLaundromats() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "certified" | "uncertified">("all");

  const { data: laundromats, isLoading } = useQuery<Laundromat[]>({
    queryKey: ["/api/laundromats"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/laundromats");
        return res.json();
      } catch {
        return [];
      }
    },
  });

  const toggleCertified = useMutation({
    mutationFn: async ({ id, certified }: { id: string; certified: boolean }) => {
      const res = await apiRequest("PATCH", `/api/laundromats/${id}`, { certified });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats"] });
      toast({ title: "Laundromat updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await apiRequest("PATCH", `/api/laundromats/${id}`, { active });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats"] });
      toast({ title: "Laundromat updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const items = (laundromats ?? []).filter((l) => {
    if (filter === "certified") return l.certified;
    if (filter === "uncertified") return !l.certified;
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laundromats</h1>
          <p className="text-sm text-muted-foreground">Manage all laundromats in the network</p>
        </div>
        <a href="#/super/laundromats/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Laundromat
          </Button>
        </a>
      </div>

      <div className="flex gap-2">
        {(["all", "certified", "uncertified"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === f
                ? "bg-[#5B4BC4] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "all" ? "All" : f === "certified" ? "Certified" : "Uncertified"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonList count={5} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No laundromats found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((l) => (
            <div key={l.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${l.active ? "bg-[#5B4BC4]/10" : "bg-muted"}`}>
                    <Building2 className={`h-5 w-5 ${l.active ? "text-[#5B4BC4]" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{l.name}</span>
                      {l.certified && (
                        <span className="text-xs bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full">Certified</span>
                      )}
                      {!l.active && (
                        <span className="text-xs bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[l.address_line1, l.city, l.state].filter(Boolean).join(", ") || "No address"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={l.certified ? "outline" : "default"}
                    onClick={() => toggleCertified.mutate({ id: l.id, certified: !l.certified })}
                    disabled={toggleCertified.isPending}
                    className="text-xs"
                  >
                    {l.certified ? (
                      <><XCircle className="h-3 w-3 mr-1" /> Uncertify</>
                    ) : (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Certify</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive.mutate({ id: l.id, active: !l.active })}
                    disabled={toggleActive.isPending}
                    className="text-xs"
                  >
                    {l.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Radius: {l.service_radius_miles} mi</span>
                <span>Capacity: {l.capacity_bags_per_day} bags/day</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
