import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Phone,
  Navigation,
  MapPin,
  Check,
  Camera,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusPill, SkeletonCard } from "@/features/shared/components";
import { cn } from "@/lib/utils";

// ─── Types ───

interface PickupOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  display_status: string;
  bags: number;
  notes: string;
  special_instructions: string;
}

interface GeofenceResponse {
  within_geofence: boolean;
}

// ─── Empty default ───

const EMPTY_ORDER: PickupOrder = {
  id: 0,
  order_number: "---",
  customer_name: "",
  customer_phone: "",
  pickup_address: "",
  delivery_address: "",
  status: "pending",
  display_status: "Pending",
  bags: 0,
  notes: "",
  special_instructions: "",
};

// ─── Step indicators ───

const STEPS = [
  { label: "Arrived", shortLabel: "Arrive" },
  { label: "Bag Count", shortLabel: "Bags" },
  { label: "Photo & Notes", shortLabel: "Photo" },
  { label: "Confirm", shortLabel: "Confirm" },
];

// ─── Component ───

export default function DriverPickup() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Geofence
  const [geoStatus, setGeoStatus] = useState<"idle" | "checking" | "verified" | "too_far">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  // Step 2: Bag count
  const [actualBagCount, setActualBagCount] = useState(1);
  const [bagCountMatches, setBagCountMatches] = useState(true);
  const [mismatchNote, setMismatchNote] = useState("");

  // Step 3: Photo & Notes
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch order
  const { data: order, isLoading } = useQuery<PickupOrder>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
    select: (data) => data ?? EMPTY_ORDER,
  });

  const currentOrder = order ?? EMPTY_ORDER;

  // Sync expected bag count once loaded
  if (order && actualBagCount === 1 && order.bags > 0) {
    setActualBagCount(order.bags);
  }

  // ─── Mutations ───

  const arrivedMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/arrived`, coords);
      return res.json() as Promise<GeofenceResponse>;
    },
    onSuccess: (data) => {
      if (data.within_geofence) {
        setGeoStatus("verified");
        toast({ title: "Location verified", description: "You are within the pickup zone." });
      } else {
        setGeoStatus("too_far");
      }
    },
    onError: (error: Error) => {
      setGeoStatus("idle");
      toast({
        title: "Arrival check failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pickupMutation = useMutation({
    mutationFn: async (payload: { bag_count: number; notes: string; photo_url: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/picked-up`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/me/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({ title: "Pickup confirmed", description: "Order has been picked up successfully." });
      navigate("/driver");
    },
    onError: (error: Error) => {
      toast({
        title: "Pickup failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ─── Handlers ───

  const handleArrived = useCallback(() => {
    setGeoStatus("checking");
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setGeoStatus("idle");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        arrivedMutation.mutate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setGeoStatus("idle");
        let message = "Unable to get your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            message = "Location request timed out. Please try again.";
            break;
        }
        setGeoError(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [arrivedMutation]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleConfirmPickup = useCallback(() => {
    if (!photoPreview) {
      toast({
        title: "Photo required",
        description: "Please take a photo before confirming pickup.",
        variant: "destructive",
      });
      return;
    }

    const fullNotes = bagCountMatches
      ? notes
      : `[Bag count mismatch: expected ${currentOrder.bags}, actual ${actualBagCount}] ${mismatchNote}\n${notes}`;

    pickupMutation.mutate({
      bag_count: actualBagCount,
      notes: fullNotes,
      photo_url: photoPreview,
    });
  }, [
    photoPreview,
    bagCountMatches,
    notes,
    currentOrder.bags,
    actualBagCount,
    mismatchNote,
    pickupMutation,
    toast,
  ]);

  const canAdvanceFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return geoStatus === "verified";
      case 1:
        return bagCountMatches || mismatchNote.trim().length > 0;
      case 2:
        return !!photoPreview;
      default:
        return true;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/driver")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">
            Pickup #{currentOrder.order_number}
          </h1>
          <StatusPill status={currentOrder.status} label={currentOrder.display_status} />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, idx) => (
          <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-full h-1.5 rounded-full transition-colors",
                idx < currentStep
                  ? "bg-green-500"
                  : idx === currentStep
                  ? "bg-primary"
                  : "bg-muted"
              )}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                idx === currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              {step.shortLabel}
            </span>
          </div>
        ))}
      </div>

      {/* Customer Info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{currentOrder.customer_name}</p>
              <p className="text-xs text-muted-foreground">{currentOrder.customer_phone}</p>
            </div>
            {currentOrder.customer_phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${currentOrder.customer_phone}`}>
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              </Button>
            )}
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{currentOrder.pickup_address}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://maps.google.com/maps?daddr=${encodeURIComponent(currentOrder.pickup_address)}`,
                  "_blank"
                )
              }
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 1: Arrived at Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm you have arrived at the pickup location. We will verify your GPS position.
            </p>

            {geoStatus === "verified" && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-400 font-medium">Location verified</span>
              </div>
            )}

            {geoStatus === "too_far" && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-400 font-medium">
                  Move closer to pickup location
                </span>
              </div>
            )}

            {geoError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-400">{geoError}</span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleArrived}
              disabled={geoStatus === "checking" || geoStatus === "verified"}
            >
              {geoStatus === "checking" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking location...
                </>
              ) : geoStatus === "verified" ? (
                <>
                  <Check className="w-4 h-4" />
                  Arrived
                </>
              ) : (
                "I've Arrived"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 2: Bag Count Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Expected bags</span>
              <span className="text-lg font-bold">{currentOrder.bags}</span>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Actual bag count</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActualBagCount(Math.max(0, actualBagCount - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-3xl font-bold w-16 text-center">{actualBagCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActualBagCount(actualBagCount + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Bag count matches</Label>
              <Switch
                checked={bagCountMatches}
                onCheckedChange={(checked) => {
                  setBagCountMatches(checked);
                  if (checked) setMismatchNote("");
                }}
              />
            </div>

            {!bagCountMatches && (
              <div>
                <Label className="text-sm text-muted-foreground mb-1.5 block">
                  Mismatch reason (required)
                </Label>
                <Textarea
                  value={mismatchNote}
                  onChange={(e) => setMismatchNote(e.target.value)}
                  placeholder="Explain the bag count discrepancy..."
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 3: Photo & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                Notes (optional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add pickup notes..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                Proof photo (required)
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />

              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Pickup proof"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-4 h-4" />
                    Retake
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-32 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tap to take photo</span>
                  </div>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 4: Confirm Pickup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Review your pickup details:</p>

            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order</span>
                <span className="font-medium">#{currentOrder.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{currentOrder.customer_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bag count</span>
                <span className="font-medium">{actualBagCount}</span>
              </div>
              {!bagCountMatches && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mismatch note</span>
                  <span className="font-medium text-orange-400 text-right max-w-[60%]">
                    {mismatchNote}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Notes</span>
                <span className="font-medium text-right max-w-[60%]">{notes}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Photo</span>
                {photoPreview ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>

            {photoPreview && (
              <img
                src={photoPreview}
                alt="Pickup proof"
                className="w-full h-32 object-cover rounded-lg border border-border"
              />
            )}

            <Button
              className="w-full"
              onClick={handleConfirmPickup}
              disabled={pickupMutation.isPending}
            >
              {pickupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Pickup
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {currentStep > 0 && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setCurrentStep(currentStep - 1)}
          >
            Back
          </Button>
        )}
        {currentStep < STEPS.length - 1 && (
          <Button
            className="flex-1"
            disabled={!canAdvanceFromStep(currentStep)}
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
