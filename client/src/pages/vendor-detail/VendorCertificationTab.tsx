import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Clock } from "lucide-react";
import { DAYS, DAY_LABELS, type DayKey, type OperatingHoursState } from "./vendor-utils";

export function VendorCertificationTab({
  // Business Details
  businessName, setBusinessName,
  contactEmail, setContactEmail,
  businessAddress, setBusinessAddress,
  businessCity, setBusinessCity,
  businessState, setBusinessState,
  businessZip, setBusinessZip,
  businessLat, setBusinessLat,
  businessLng, setBusinessLng,
  businessDetailsDirty, setBusinessDetailsDirty,
  businessDetailsMutation,
  handleBusinessDetailsSave,
  // Operating Hours
  operatingHours, setOperatingHours,
  adminOverrideOpen, setAdminOverrideOpen,
  hoursDirty, setHoursDirty,
  hoursMutation,
  handleHoursSave,
}: {
  businessName: string; setBusinessName: (v: string) => void;
  contactEmail: string; setContactEmail: (v: string) => void;
  businessAddress: string; setBusinessAddress: (v: string) => void;
  businessCity: string; setBusinessCity: (v: string) => void;
  businessState: string; setBusinessState: (v: string) => void;
  businessZip: string; setBusinessZip: (v: string) => void;
  businessLat: string; setBusinessLat: (v: string) => void;
  businessLng: string; setBusinessLng: (v: string) => void;
  businessDetailsDirty: boolean; setBusinessDetailsDirty: (v: boolean) => void;
  businessDetailsMutation: any;
  handleBusinessDetailsSave: () => void;
  operatingHours: OperatingHoursState; setOperatingHours: React.Dispatch<React.SetStateAction<OperatingHoursState>>;
  adminOverrideOpen: boolean; setAdminOverrideOpen: (v: boolean) => void;
  hoursDirty: boolean; setHoursDirty: (v: boolean) => void;
  hoursMutation: any;
  handleHoursSave: () => void;
}) {
  return (
    <>
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
    </>
  );
}
