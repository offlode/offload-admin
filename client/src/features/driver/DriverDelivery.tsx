import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft,
  Phone,
  Navigation,
  MapPin,
  Check,
  Camera,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill, SkeletonCard } from "@/features/shared/components";
import { cn } from "@/lib/utils";

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

// ─── Signature Pad ───

function SignaturePad({
  onSignatureChange,
}: {
  onSignatureChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoords(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasDrawn(true);
    },
    [getCoords]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoords(e);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    },
    [isDrawing, getCoords]
  );

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSignatureChange(canvas.toDataURL("image/png"));
    }
  }, [isDrawing, onSignatureChange]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  }, [onSignatureChange]);

  // Initialize canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full h-40 touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-muted-foreground">Sign here</span>
          </div>
        )}
      </div>
      {hasDrawn && (
        <Button variant="outline" size="sm" onClick={clearSignature}>
          <Trash2 className="w-4 h-4" />
          Clear signature
        </Button>
      )}
    </div>
  );
}

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
              <p className="text-sm text-foreground">{currentOrder.delivery_address}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://maps.google.com/maps?daddr=${encodeURIComponent(currentOrder.delivery_address)}`,
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
            <CardTitle className="text-base">Step 1: Arrived at Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm you have arrived at the delivery location. We will verify your GPS position.
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
                  Move closer to delivery location
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
            <CardTitle className="text-base">Step 2: Proof of Delivery Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take a photo showing the bags at the delivery location as proof of delivery.
            </p>

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
                  alt="Delivery proof"
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
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 3: Delivery Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add any notes about the delivery (optional).
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Left at front door, handed to resident..."
              rows={4}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 4: Customer Signature (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Have the customer sign below to confirm delivery. This step is optional.
            </p>
            <SignaturePad onSignatureChange={setSignatureDataUrl} />
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 5: Confirm Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Review your delivery details:</p>

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
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-right max-w-[60%]">
                  {currentOrder.delivery_address}
                </span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Photo</span>
                {photoPreview ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              {notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-right max-w-[60%]">{notes}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Signature</span>
                {signatureDataUrl ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <span className="text-xs text-muted-foreground">Skipped</span>
                )}
              </div>
            </div>

            {photoPreview && (
              <img
                src={photoPreview}
                alt="Delivery proof"
                className="w-full h-32 object-cover rounded-lg border border-border"
              />
            )}

            {signatureDataUrl && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Signature</Label>
                <img
                  src={signatureDataUrl}
                  alt="Customer signature"
                  className="w-full h-20 object-contain rounded-lg border border-border bg-muted/30"
                />
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleConfirmDelivery}
              disabled={deliveryMutation.isPending}
            >
              {deliveryMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm Delivery
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
