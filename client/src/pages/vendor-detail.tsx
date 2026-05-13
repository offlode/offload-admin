import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Activity, Clock, Package, DollarSign, Percent, MapPin, Building2 } from "lucide-react";
import { useState, useEffect } from "react";

// ── D7+D8 types ──
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayKey = typeof DAYS[number];
const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
interface DayHours { open: string; close: string; closed: boolean; }
type OperatingHoursState = Record<DayKey, DayHours>;

function defaultHours(): OperatingHoursState {
  return Object.fromEntries(
    DAYS.map(d => [d, { open: "08:00", close: "20:00", closed: false }])
  ) as OperatingHoursState;
}

function parseOperatingHours(raw: unknown): OperatingHoursState {
  const base = defaultHours();
  if (!raw || typeof raw !== "string") return base;
  try {
    const parsed = JSON.parse(raw);
    for (const d of DAYS) {
      if (parsed[d]) {
        base[d] = {
          open: parsed[d].open ?? "08:00",
          close: parsed[d].close ?? "20:00",
          closed: !!parsed[d].closed,
        };
      }
    }
  } catch { /* use defaults */ }
  return base;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function parseServiceZips(raw: unknown): string {
  if (!raw) return "";
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.join(", ");
    } catch {
      // not JSON, treat as-is
    }
    return raw;
  }
  return "";
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: vendor, isLoading } = useQuery<any>({ queryKey: ["/api/vendors", id] });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/transactions"] });

  const [commissionPct, setCommissionPct] = useState<number | "">("" as number | "");

  // Service area & capabilities state
  const [serviceAreaType, setServiceAreaType] = useState<string>("zips");
  const [serviceZips, setServiceZips] = useState<string>("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState<string>("");
  const [ownsDrivers, setOwnsDrivers] = useState<boolean>(false);
  const [pauseOrderIntake, setPauseOrderIntake] = useState<boolean>(false);
  const [acceptanceTimeoutSec, setAcceptanceTimeoutSec] = useState<string>("90");
  const [offersStainTreatment, setOffersStainTreatment] = useState<boolean>(false);
  const [offersSteamPress, setOffersSteamPress] = useState<boolean>(false);
  const [offersHangDry, setOffersHangDry] = useState<boolean>(false);
  const [serviceAreaDirty, setServiceAreaDirty] = useState<boolean>(false);

  // D7: Business Details state
  const [businessName, setBusinessName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [businessAddress, setBusinessAddress] = useState<string>("");
  const [businessCity, setBusinessCity] = useState<string>("");
  const [businessState, setBusinessState] = useState<string>("");
  const [businessZip, setBusinessZip] = useState<string>("");
  const [businessLat, setBusinessLat] = useState<string>("");
  const [businessLng, setBusinessLng] = useState<string>("");
  const [businessDetailsDirty, setBusinessDetailsDirty] = useState<boolean>(false);

  // D8: Operating Hours state
  const [operatingHours, setOperatingHours] = useState<OperatingHoursState>(defaultHours());
  const [adminOverrideOpen, setAdminOverrideOpen] = useState<boolean>(false);
  const [hoursDirty, setHoursDirty] = useState<boolean>(false);

  // Sync service area fields when vendor data loads
  useEffect(() => {
    if (!vendor) return;
    setServiceAreaType(vendor.serviceAreaType ?? "zips");
    setServiceZips(parseServiceZips(vendor.serviceZips));
    setServiceRadiusMiles(vendor.serviceRadiusMiles != null ? String(vendor.serviceRadiusMiles) : "");
    setOwnsDrivers(!!vendor.ownsDrivers);
    setPauseOrderIntake(!!vendor.pauseOrderIntake);
    setAcceptanceTimeoutSec(vendor.acceptanceTimeoutSec != null ? String(vendor.acceptanceTimeoutSec) : "90");
    setOffersStainTreatment(!!vendor.offersStainTreatment);
    setOffersSteamPress(!!vendor.offersSteamPress);
    setOffersHangDry(!!vendor.offersHangDry);
    setServiceAreaDirty(false);
    // D7: Business Details
    setBusinessName(vendor.businessName ?? "");
    setContactEmail(vendor.contactEmail ?? "");
    setBusinessAddress(vendor.businessAddress ?? "");
    setBusinessCity(vendor.businessCity ?? "");
    setBusinessState(vendor.businessState ?? "");
    setBusinessZip(vendor.businessZip ?? "");
    setBusinessLat(vendor.businessLat != null ? String(vendor.businessLat) : "");
    setBusinessLng(vendor.businessLng != null ? String(vendor.businessLng) : "");
    setBusinessDetailsDirty(false);
    // D8: Operating Hours
    setOperatingHours(parseOperatingHours(vendor.operatingHoursJson));
    setAdminOverrideOpen(!!vendor.adminOverrideOpen);
    setHoursDirty(false);
  }, [vendor]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Vendor updated" });
    },
  });

  const commissionMutation = useMutation({
    mutationFn: (payoutRate: number) => apiRequest("PATCH", `/api/vendors/${id}`, { payoutRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      toast({ title: "Commission rate saved" });
    },
    onError: () => {
      toast({ title: "Failed to save commission", variant: "destructive" });
    },
  });

  const serviceAreaMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      setServiceAreaDirty(false);
      toast({ title: "Service area saved" });
    },
    onError: () => {
      toast({ title: "Failed to save service area", variant: "destructive" });
    },
  });

  function handleServiceAreaSave() {
    // Parse comma-separated ZIPs into JSON-encoded array
    const zipsArray = serviceZips
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean);
    serviceAreaMutation.mutate({
      serviceAreaType,
      serviceZips: JSON.stringify(zipsArray),
      serviceRadiusMiles: serviceRadiusMiles !== "" ? Number(serviceRadiusMiles) : null,
      ownsDrivers: ownsDrivers ? 1 : 0,
      pauseOrderIntake: pauseOrderIntake ? 1 : 0,
      acceptanceTimeoutSec: acceptanceTimeoutSec !== "" ? Number(acceptanceTimeoutSec) : 90,
      offersStainTreatment: offersStainTreatment ? 1 : 0,
      offersSteamPress: offersSteamPress ? 1 : 0,
      offersHangDry: offersHangDry ? 1 : 0,
    });
  }

  // D7: Business Details mutation
  const businessDetailsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      setBusinessDetailsDirty(false);
      toast({ title: "Business details saved" });
    },
    onError: () => {
      toast({ title: "Failed to save business details", variant: "destructive" });
    },
  });

  function handleBusinessDetailsSave() {
    businessDetailsMutation.mutate({
      businessName: businessName || null,
      contactEmail: contactEmail || null,
      businessAddress: businessAddress || null,
      businessCity: businessCity || null,
      businessState: businessState || null,
      businessZip: businessZip || null,
      businessLat: businessLat !== "" ? Number(businessLat) : null,
      businessLng: businessLng !== "" ? Number(businessLng) : null,
    });
  }

  // D8: Operating Hours mutation
  const hoursMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PATCH", `/api/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors", id] });
      setHoursDirty(false);
      toast({ title: "Operating hours saved" });
    },
    onError: () => {
      toast({ title: "Failed to save operating hours", variant: "destructive" });
    },
  });

  function handleHoursSave() {
    hoursMutation.mutate({
      operatingHoursJson: JSON.stringify(operatingHours),
      adminOverrideOpen: adminOverrideOpen ? 1 : 0,
    });
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96" /></div>;
  if (!vendor) return <div className="p-6 text-muted-foreground">Vendor not found</div>;

  const currentPayoutRate = vendor.payoutRate ?? 0.65;
  const currentPct = Math.round(currentPayoutRate * 100);
  const displayPct = commissionPct === "" ? currentPct : commissionPct;
  const sampleOrder = 30;
  const vendorGets = sampleOrder * (Number(displayPct) / 100);
  const platformDriver = sampleOrder - vendorGets;

  const vendorPayouts = transactions.filter((t: any) => t.recipientType === "vendor" && t.recipientId === vendor.id);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center gap-3">
        <Link href="/vendors">
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{vendor.name}</h1>
          <p className="text-sm text-muted-foreground">{vendor.address}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge variant={vendor.status === "active" ? "default" : "destructive"} className="capitalize">{vendor.status}</Badge>
          {vendor.status === "active" ? (
            <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ status: "suspended" })} data-testid="button-suspend">Suspend</Button>
          ) : (
            <Button size="sm" onClick={() => updateMutation.mutate({ status: "active" })} data-testid="button-approve">Approve</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Activity className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Health Score</span></div>
          <p className={`text-lg font-semibold ${vendor.healthScore >= 80 ? 'text-green-500' : vendor.healthScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
            {vendor.healthScore.toFixed(0)}/100
          </p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Star className="h-3.5 w-3.5 text-yellow-500" /><span className="text-xs text-muted-foreground">Quality</span></div>
          <p className="text-lg font-semibold">{vendor.qualityScore.toFixed(1)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Package className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Orders</span></div>
          <p className="text-lg font-semibold">{vendor.totalOrders}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><Clock className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Avg Processing</span></div>
          <p className="text-lg font-semibold">{vendor.avgProcessingTime.toFixed(0)}h</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-1 mb-1"><DollarSign className="h-3.5 w-3.5" /><span className="text-xs text-muted-foreground">Total Payout</span></div>
          <p className="text-lg font-semibold">{formatCurrency(vendor.totalPayout)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-xs">Phone</p><p>{vendor.phone}</p></div>
              <div><p className="text-muted-foreground text-xs">Email</p><p>{vendor.email}</p></div>
              <div><p className="text-muted-foreground text-xs">Hours</p><p>{vendor.operatingHours}</p></div>
              <div><p className="text-muted-foreground text-xs">Capacity</p><p>{vendor.currentLoad}/{vendor.capacity}</p></div>
              <div><p className="text-muted-foreground text-xs">Joined</p><p>{new Date(vendor.joinedAt).toLocaleDateString()}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" />Commission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="input-vendor-commission" className="text-xs">Payout Rate (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="input-vendor-commission"
                  data-testid="input-vendor-commission"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-28"
                  placeholder={String(currentPct)}
                  value={commissionPct}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value)));
                    setCommissionPct(v);
                  }}
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button
                  size="sm"
                  data-testid="button-save-commission"
                  disabled={commissionPct === "" || commissionMutation.isPending}
                  onClick={() => {
                    if (commissionPct !== "") {
                      commissionMutation.mutate(Number(commissionPct) / 100);
                      setCommissionPct("");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">What % the vendor keeps. The rest is split between Offload (platform fee) and the driver.</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2 text-xs space-y-0.5">
              <p className="font-medium">Preview — $30 order</p>
              <p>Vendor gets: <span className="font-semibold">{formatCurrency(vendorGets)}</span></p>
              <p>Platform + driver get: <span className="font-semibold">{formatCurrency(platformDriver)}</span></p>
              <p className="text-muted-foreground">(Using {displayPct}% rate)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {vendorPayouts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No payouts found</p>
            ) : (
              <div className="space-y-2">
                {vendorPayouts.slice(0, 10).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-xs">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={t.status === "completed" ? "default" : "secondary"} className="text-xs">{t.status}</Badge>
                      <span className="font-medium">{formatCurrency(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* D7: Business Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Business Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="input-business-name" className="text-xs">Business Name</Label>
              <Input
                id="input-business-name"
                data-testid="input-business-name"
                className="h-8 text-sm"
                placeholder="e.g. Sunshine Laundry LLC"
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setBusinessDetailsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-contact-email" className="text-xs">Contact Email</Label>
              <Input
                id="input-contact-email"
                data-testid="input-contact-email"
                type="email"
                className="h-8 text-sm"
                placeholder="owner@example.com"
                value={contactEmail}
                onChange={(e) => { setContactEmail(e.target.value); setBusinessDetailsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="input-business-address" className="text-xs">Business Address</Label>
              <Input
                id="input-business-address"
                data-testid="input-business-address"
                className="h-8 text-sm"
                placeholder="123 Main St"
                value={businessAddress}
                onChange={(e) => { setBusinessAddress(e.target.value); setBusinessDetailsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-business-city" className="text-xs">City</Label>
              <Input
                id="input-business-city"
                data-testid="input-business-city"
                className="h-8 text-sm"
                placeholder="Brooklyn"
                value={businessCity}
                onChange={(e) => { setBusinessCity(e.target.value); setBusinessDetailsDirty(true); }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="input-business-state" className="text-xs">State</Label>
                <Input
                  id="input-business-state"
                  data-testid="input-business-state"
                  className="h-8 text-sm"
                  placeholder="NY"
                  maxLength={2}
                  value={businessState}
                  onChange={(e) => { setBusinessState(e.target.value.toUpperCase()); setBusinessDetailsDirty(true); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-business-zip" className="text-xs">ZIP</Label>
                <Input
                  id="input-business-zip"
                  data-testid="input-business-zip"
                  className="h-8 text-sm"
                  placeholder="11201"
                  value={businessZip}
                  onChange={(e) => { setBusinessZip(e.target.value); setBusinessDetailsDirty(true); }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-business-lat" className="text-xs">Latitude <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="input-business-lat"
                data-testid="input-business-lat"
                type="number"
                step="any"
                className="h-8 text-sm"
                placeholder="40.6782"
                value={businessLat}
                onChange={(e) => { setBusinessLat(e.target.value); setBusinessDetailsDirty(true); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="input-business-lng" className="text-xs">Longitude <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="input-business-lng"
                data-testid="input-business-lng"
                type="number"
                step="any"
                className="h-8 text-sm"
                placeholder="-73.9442"
                value={businessLng}
                onChange={(e) => { setBusinessLng(e.target.value); setBusinessDetailsDirty(true); }}
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              data-testid="button-save-business-details"
              disabled={!businessDetailsDirty || businessDetailsMutation.isPending}
              onClick={handleBusinessDetailsSave}
            >
              {businessDetailsMutation.isPending ? "Saving…" : "Save Business Details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* D8: Operating Hours */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Operating Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="grid grid-cols-[120px_1fr_1fr_auto] items-center gap-2 text-sm">
                <span className="text-xs font-medium">{DAY_LABELS[day]}</span>
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground sr-only">Open</Label>
                  <Input
                    type="time"
                    className="h-7 text-xs"
                    data-testid={`input-hours-open-${day}`}
                    disabled={operatingHours[day].closed}
                    value={operatingHours[day].open}
                    onChange={(e) => {
                      setOperatingHours(prev => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }));
                      setHoursDirty(true);
                    }}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground sr-only">Close</Label>
                  <Input
                    type="time"
                    className="h-7 text-xs"
                    data-testid={`input-hours-close-${day}`}
                    disabled={operatingHours[day].closed}
                    value={operatingHours[day].close}
                    onChange={(e) => {
                      setOperatingHours(prev => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }));
                      setHoursDirty(true);
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`chk-closed-${day}`}
                    data-testid={`chk-closed-${day}`}
                    checked={operatingHours[day].closed}
                    onCheckedChange={(v) => {
                      setOperatingHours(prev => ({ ...prev, [day]: { ...prev[day], closed: !!v } }));
                      setHoursDirty(true);
                    }}
                  />
                  <Label htmlFor={`chk-closed-${day}`} className="text-xs cursor-pointer text-muted-foreground">Closed</Label>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 flex items-center gap-2">
            <Checkbox
              id="chk-admin-override-open"
              data-testid="chk-admin-override-open"
              checked={adminOverrideOpen}
              onCheckedChange={(v) => { setAdminOverrideOpen(!!v); setHoursDirty(true); }}
            />
            <Label htmlFor="chk-admin-override-open" className="text-xs cursor-pointer">
              Admin Override: Force Open <span className="text-muted-foreground font-normal">(ignores hours above)</span>
            </Label>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              data-testid="button-save-hours"
              disabled={!hoursDirty || hoursMutation.isPending}
              onClick={handleHoursSave}
            >
              {hoursMutation.isPending ? "Saving…" : "Save Operating Hours"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Area & Capabilities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Service Area &amp; Capabilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Service Area Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Service Area Type</Label>
              <Select
                value={serviceAreaType}
                onValueChange={(v) => { setServiceAreaType(v); setServiceAreaDirty(true); }}
              >
                <SelectTrigger className="h-8 text-sm" data-testid="select-service-area-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zips">ZIP Codes</SelectItem>
                  <SelectItem value="radius">Radius</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Radius */}
            <div className="space-y-1.5">
              <Label htmlFor="input-service-radius" className="text-xs">Service Radius (miles)</Label>
              <Input
                id="input-service-radius"
                data-testid="input-service-radius"
                type="number"
                min={0}
                step={0.1}
                className="h-8 text-sm"
                placeholder="e.g. 10"
                value={serviceRadiusMiles}
                onChange={(e) => { setServiceRadiusMiles(e.target.value); setServiceAreaDirty(true); }}
              />
            </div>

            {/* Acceptance Timeout */}
            <div className="space-y-1.5">
              <Label htmlFor="input-acceptance-timeout" className="text-xs">Acceptance Timeout (seconds)</Label>
              <Input
                id="input-acceptance-timeout"
                data-testid="input-acceptance-timeout"
                type="number"
                min={10}
                step={5}
                className="h-8 text-sm"
                placeholder="90"
                value={acceptanceTimeoutSec}
                onChange={(e) => { setAcceptanceTimeoutSec(e.target.value); setServiceAreaDirty(true); }}
              />
            </div>
          </div>

          {/* Service ZIPs */}
          <div className="space-y-1.5">
            <Label htmlFor="textarea-service-zips" className="text-xs">
              Service ZIPs <span className="text-muted-foreground font-normal">(comma-separated)</span>
            </Label>
            <Textarea
              id="textarea-service-zips"
              data-testid="textarea-service-zips"
              className="text-sm resize-none h-20"
              placeholder="10001, 10002, 10003…"
              value={serviceZips}
              onChange={(e) => { setServiceZips(e.target.value); setServiceAreaDirty(true); }}
            />
          </div>

          {/* Toggles & Capabilities */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="chk-owns-drivers"
                data-testid="chk-owns-drivers"
                checked={ownsDrivers}
                onCheckedChange={(v) => { setOwnsDrivers(!!v); setServiceAreaDirty(true); }}
              />
              <Label htmlFor="chk-owns-drivers" className="text-xs cursor-pointer">Owns Drivers</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="chk-pause-intake"
                data-testid="chk-pause-intake"
                checked={pauseOrderIntake}
                onCheckedChange={(v) => { setPauseOrderIntake(!!v); setServiceAreaDirty(true); }}
              />
              <Label htmlFor="chk-pause-intake" className="text-xs cursor-pointer">Pause Order Intake</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="chk-stain-treatment"
                data-testid="chk-stain-treatment"
                checked={offersStainTreatment}
                onCheckedChange={(v) => { setOffersStainTreatment(!!v); setServiceAreaDirty(true); }}
              />
              <Label htmlFor="chk-stain-treatment" className="text-xs cursor-pointer">Stain Treatment</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="chk-steam-press"
                data-testid="chk-steam-press"
                checked={offersSteamPress}
                onCheckedChange={(v) => { setOffersSteamPress(!!v); setServiceAreaDirty(true); }}
              />
              <Label htmlFor="chk-steam-press" className="text-xs cursor-pointer">Steam Press</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="chk-hang-dry"
                data-testid="chk-hang-dry"
                checked={offersHangDry}
                onCheckedChange={(v) => { setOffersHangDry(!!v); setServiceAreaDirty(true); }}
              />
              <Label htmlFor="chk-hang-dry" className="text-xs cursor-pointer">Hang Dry</Label>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              data-testid="button-save-service-area"
              disabled={!serviceAreaDirty || serviceAreaMutation.isPending}
              onClick={handleServiceAreaSave}
            >
              {serviceAreaMutation.isPending ? "Saving…" : "Save Service Area"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
