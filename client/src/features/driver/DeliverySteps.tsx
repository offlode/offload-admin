import { useState, useRef, useCallback, useEffect } from "react";
import {
  Check,
  Camera,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

// ─── Step Content Components ───

export function ArrivedStep({
  geoStatus,
  geoError,
  onArrived,
}: {
  geoStatus: "idle" | "checking" | "verified" | "too_far";
  geoError: string | null;
  onArrived: () => void;
}) {
  return (
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
          onClick={onArrived}
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
  );
}

export function PhotoStep({
  photoPreview,
  fileInputRef,
  onPhotoChange,
}: {
  photoPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
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
          onChange={onPhotoChange}
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
  );
}

export function NotesStep({
  notes,
  setNotes,
}: {
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
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
  );
}

export function SignatureStep({
  onSignatureChange,
}: {
  onSignatureChange: (dataUrl: string | null) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Step 4: Customer Signature (Optional)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Have the customer sign below to confirm delivery. This step is optional.
        </p>
        <SignaturePad onSignatureChange={onSignatureChange} />
      </CardContent>
    </Card>
  );
}
