import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";

export function VendorFinancialsTab({
  serviceAreaType, setServiceAreaType,
  serviceZips, setServiceZips,
  serviceRadiusMiles, setServiceRadiusMiles,
  ownsDrivers, setOwnsDrivers,
  pauseOrderIntake, setPauseOrderIntake,
  acceptanceTimeoutSec, setAcceptanceTimeoutSec,
  offersStainTreatment, setOffersStainTreatment,
  offersSteamPress, setOffersSteamPress,
  offersHangDry, setOffersHangDry,
  serviceAreaDirty, setServiceAreaDirty,
  serviceAreaMutation,
  handleServiceAreaSave,
}: {
  serviceAreaType: string; setServiceAreaType: (v: string) => void;
  serviceZips: string; setServiceZips: (v: string) => void;
  serviceRadiusMiles: string; setServiceRadiusMiles: (v: string) => void;
  ownsDrivers: boolean; setOwnsDrivers: (v: boolean) => void;
  pauseOrderIntake: boolean; setPauseOrderIntake: (v: boolean) => void;
  acceptanceTimeoutSec: string; setAcceptanceTimeoutSec: (v: string) => void;
  offersStainTreatment: boolean; setOffersStainTreatment: (v: boolean) => void;
  offersSteamPress: boolean; setOffersSteamPress: (v: boolean) => void;
  offersHangDry: boolean; setOffersHangDry: (v: boolean) => void;
  serviceAreaDirty: boolean; setServiceAreaDirty: (v: boolean) => void;
  serviceAreaMutation: any;
  handleServiceAreaSave: () => void;
}) {
  return (
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
  );
}
