import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

import { defaultHours, parseOperatingHours, parseServiceZips, type OperatingHoursState } from "./vendor-utils";
import { VendorInfoTab } from "./VendorInfoTab";
import { VendorCertificationTab } from "./VendorCertificationTab";
import { VendorFinancialsTab } from "./VendorFinancialsTab";

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

      <VendorInfoTab
        vendor={vendor}
        commissionPct={commissionPct}
        setCommissionPct={setCommissionPct}
        commissionMutation={commissionMutation}
        vendorPayouts={vendorPayouts}
      />

      <VendorCertificationTab
        businessName={businessName} setBusinessName={setBusinessName}
        contactEmail={contactEmail} setContactEmail={setContactEmail}
        businessAddress={businessAddress} setBusinessAddress={setBusinessAddress}
        businessCity={businessCity} setBusinessCity={setBusinessCity}
        businessState={businessState} setBusinessState={setBusinessState}
        businessZip={businessZip} setBusinessZip={setBusinessZip}
        businessLat={businessLat} setBusinessLat={setBusinessLat}
        businessLng={businessLng} setBusinessLng={setBusinessLng}
        businessDetailsDirty={businessDetailsDirty} setBusinessDetailsDirty={setBusinessDetailsDirty}
        businessDetailsMutation={businessDetailsMutation}
        handleBusinessDetailsSave={handleBusinessDetailsSave}
        operatingHours={operatingHours} setOperatingHours={setOperatingHours}
        adminOverrideOpen={adminOverrideOpen} setAdminOverrideOpen={setAdminOverrideOpen}
        hoursDirty={hoursDirty} setHoursDirty={setHoursDirty}
        hoursMutation={hoursMutation}
        handleHoursSave={handleHoursSave}
      />

      <VendorFinancialsTab
        serviceAreaType={serviceAreaType} setServiceAreaType={setServiceAreaType}
        serviceZips={serviceZips} setServiceZips={setServiceZips}
        serviceRadiusMiles={serviceRadiusMiles} setServiceRadiusMiles={setServiceRadiusMiles}
        ownsDrivers={ownsDrivers} setOwnsDrivers={setOwnsDrivers}
        pauseOrderIntake={pauseOrderIntake} setPauseOrderIntake={setPauseOrderIntake}
        acceptanceTimeoutSec={acceptanceTimeoutSec} setAcceptanceTimeoutSec={setAcceptanceTimeoutSec}
        offersStainTreatment={offersStainTreatment} setOffersStainTreatment={setOffersStainTreatment}
        offersSteamPress={offersSteamPress} setOffersSteamPress={setOffersSteamPress}
        offersHangDry={offersHangDry} setOffersHangDry={setOffersHangDry}
        serviceAreaDirty={serviceAreaDirty} setServiceAreaDirty={setServiceAreaDirty}
        serviceAreaMutation={serviceAreaMutation}
        handleServiceAreaSave={handleServiceAreaSave}
      />
    </div>
  );
}
