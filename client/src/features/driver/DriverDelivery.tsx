import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { StatusPill, SkeletonCard } from "@/features/shared/components";
import { cn } from "@/lib/utils";

import { DeliveryMap } from "./DeliveryMap";
import { ArrivedStep, PhotoStep, NotesStep, SignatureStep } from "./DeliverySteps";
import { DeliveryConfirmation } from "./DeliveryConfirmation";

// ─── Types ───

interface DeliveryOrder {
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
}

interface GeofenceResponse {
  within_geofence: boolean;
}

// ─── Empty default ───

const EMPTY_ORDER: DeliveryOrder = {
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
};

// ─── Steps ───

const STEPS = [
  { label: "Arrived", shortLabel: "Arrive" },
  { label: "Photo Proof", shortLabel: "Photo" },
  { label: "Notes", shortLabel: "Notes" },
  { label: "Signature", shortLabel: "Sign" },
  { label: "Confirm", shortLabel: "Confirm" },
];

// ─── Component ───

export default function DriverDelivery() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Geofence
  const [geoStatus, setGeoStatus] = useState<"idle" | "checking" | "verified" | "too_far">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  // Step 2: Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Notes
  const [notes, setNotes] = useState("");

  // Step 4: Signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Fetch order
  const { data: order, isLoading } = useQuery<DeliveryOrder>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
    select: (data) => data ?? EMPTY_ORDER,
  });

  const currentOrder = order ?? EMPTY_ORDER;

  // ─── Mutations ───

  const arrivedMutation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) => {
      const res = await apiRequest("PATCH", `/api/orders/${orderId}/arrived-delivery`, coords);
      return res.json() as Promise<GeofenceResponse>;
    },
    onSuccess: (data) => {
      if (data.within_geofence) {
        setGeoStatus("verified");
        toast({ title: "Location verified", description: "You are at the delivery zone." });
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

  const deliveryMutation = useMutation({
    mutationFn: async (payload: {
      photo_url: string;
      notes: string;
      signature_data?: string;
    }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/delivered`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/me/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({ title: "Delivery confirmed", description: "Order has been delivered successfully." });
      navigate("/driver");
    },
    onError: (error: Error) => {
      toast({
        title: "Delivery failed",
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

  const handleConfirmDelivery = useCallback(() => {
    if (!photoPreview) {
      toast({
        title: "Photo required",
        description: "Please take a proof-of-delivery photo.",
        variant: "destructive",
      });
      return;
    }

    deliveryMutation.mutate({
      photo_url: photoPreview,
      notes,
      signature_data: signatureDataUrl ?? undefined,
    });
  }, [photoPreview, notes, signatureDataUrl, deliveryMutation, toast]);

  const canAdvanceFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return geoStatus === "verified";
      case 1:
        return !!photoPreview;
      case 2:
        return true; // Notes are optional for delivery
      case 3:
        return true; // Signature is optional
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
            Delivery #{currentOrder.order_number}
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
      <DeliveryMap order={currentOrder} />

      {/* Step Content */}
      {currentStep === 0 && (
        <ArrivedStep
          geoStatus={geoStatus}
          geoError={geoError}
          onArrived={handleArrived}
        />
      )}

      {currentStep === 1 && (
        <PhotoStep
          photoPreview={photoPreview}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
          onPhotoChange={handlePhotoChange}
        />
      )}

      {currentStep === 2 && (
        <NotesStep notes={notes} setNotes={setNotes} />
      )}

      {currentStep === 3 && (
        <SignatureStep onSignatureChange={setSignatureDataUrl} />
      )}

      {currentStep === 4 && (
        <DeliveryConfirmation
          order={currentOrder}
          photoPreview={photoPreview}
          notes={notes}
          signatureDataUrl={signatureDataUrl}
          isPending={deliveryMutation.isPending}
          onConfirm={handleConfirmDelivery}
        />
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
