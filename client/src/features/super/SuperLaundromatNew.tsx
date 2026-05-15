import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2 } from "lucide-react";

export default function SuperLaundromatNew() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({
    name: "",
    address_line1: "",
    city: "",
    state: "",
    zip: "",
    lat: "",
    lng: "",
    service_radius_miles: "10",
    capacity_bags_per_day: "100",
    owner_email: "",
    owner_name: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/laundromats", {
        name: form.name,
        address_line1: form.address_line1,
        city: form.city,
        state: form.state,
        zip: form.zip,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
        service_radius_miles: parseInt(form.service_radius_miles) || 10,
        capacity_bags_per_day: parseInt(form.capacity_bags_per_day) || 100,
        owner_email: form.owner_email || undefined,
        owner_name: form.owner_name || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats"] });
      toast({ title: "Laundromat created" });
      navigate("/super/laundromats");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <a href="#/super/laundromats">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </a>
        <div>
          <h1 className="text-2xl font-bold">Add Laundromat</h1>
          <p className="text-sm text-muted-foreground">Create a new laundromat in the network</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-5 w-5 text-[#5B4BC4]" />
          <h2 className="font-semibold">Business Details</h2>
        </div>

        <div className="space-y-1">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Brooklyn Laundry Co" />
        </div>

        <div className="space-y-1">
          <Label>Address</Label>
          <Input value={form.address_line1} onChange={(e) => handleChange("address_line1", e.target.value)} placeholder="123 Main St" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="Brooklyn" />
          </div>
          <div className="space-y-1">
            <Label>State</Label>
            <Input value={form.state} onChange={(e) => handleChange("state", e.target.value)} placeholder="NY" />
          </div>
          <div className="space-y-1">
            <Label>ZIP</Label>
            <Input value={form.zip} onChange={(e) => handleChange("zip", e.target.value)} placeholder="11201" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Latitude</Label>
            <Input value={form.lat} onChange={(e) => handleChange("lat", e.target.value)} placeholder="40.7484" />
          </div>
          <div className="space-y-1">
            <Label>Longitude</Label>
            <Input value={form.lng} onChange={(e) => handleChange("lng", e.target.value)} placeholder="-73.9857" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Service Radius (miles)</Label>
            <Input type="number" value={form.service_radius_miles} onChange={(e) => handleChange("service_radius_miles", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Capacity (bags/day)</Label>
            <Input type="number" value={form.capacity_bags_per_day} onChange={(e) => handleChange("capacity_bags_per_day", e.target.value)} />
          </div>
        </div>

        <hr className="border-border" />

        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-semibold">Owner (optional)</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">If provided, an owner account will be created and linked to this laundromat.</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Owner Email</Label>
            <Input type="email" value={form.owner_email} onChange={(e) => handleChange("owner_email", e.target.value)} placeholder="owner@example.com" />
          </div>
          <div className="space-y-1">
            <Label>Owner Name</Label>
            <Input value={form.owner_name} onChange={(e) => handleChange("owner_name", e.target.value)} placeholder="John Doe" />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create Laundromat"}
        </Button>
      </form>
    </div>
  );
}
