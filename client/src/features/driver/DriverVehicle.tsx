import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Car,
  Camera,
  Save,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkeletonCard } from "@/features/shared/components";

// ─── Types ───

interface VehicleProfile {
  color: string;
  model: string;
  license_plate: string;
  photo_url: string | null;
}

// ─── Fallback ───

const FALLBACK_VEHICLE: VehicleProfile = {
  color: "",
  model: "",
  license_plate: "",
  photo_url: null,
};

// ─── Component ───

export default function DriverVehicle() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [color, setColor] = useState("");
  const [model, setModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch vehicle profile
  const { data: vehicle, isLoading } = useQuery<VehicleProfile>({
    queryKey: ["/api/drivers/me/vehicle"],
    select: (data) => data ?? FALLBACK_VEHICLE,
  });

  // Sync form with fetched data once
  if (vehicle && !initialized) {
    setColor(vehicle.color || "");
    setModel(vehicle.model || "");
    setLicensePlate(vehicle.license_plate || "");
    if (vehicle.photo_url) {
      setPhotoPreview(vehicle.photo_url);
    }
    setInitialized(true);
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      color: string;
      model: string;
      license_plate: string;
      photo?: string;
    }) => {
      const res = await apiRequest("PUT", "/api/drivers/me/vehicle", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drivers/me/vehicle"] });
      toast({
        title: "Vehicle updated",
        description: "Your vehicle information has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ─── Handlers ───

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

  const handleSave = useCallback(() => {
    const payload: {
      color: string;
      model: string;
      license_plate: string;
      photo?: string;
    } = {
      color: color.trim(),
      model: model.trim(),
      license_plate: licensePlate.trim(),
    };

    // Include photo data URL if a new file was selected
    if (photoFile && photoPreview) {
      payload.photo = photoPreview;
    }

    saveMutation.mutate(payload);
  }, [color, model, licensePlate, photoFile, photoPreview, saveMutation]);

  const hasChanges =
    vehicle &&
    (color.trim() !== (vehicle.color || "") ||
      model.trim() !== (vehicle.model || "") ||
      licensePlate.trim() !== (vehicle.license_plate || "") ||
      !!photoFile);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-lg mx-auto space-y-4">
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
          <h1 className="text-lg font-bold text-foreground">Vehicle Profile</h1>
          <p className="text-xs text-muted-foreground">Update your vehicle information</p>
        </div>
        <Car className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Vehicle Photo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vehicle Photo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Vehicle"
                className="w-full h-48 object-cover rounded-lg border border-border"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-2 right-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                Change photo
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-40 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload vehicle photo</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Details Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-color" className="text-sm text-muted-foreground">
              Color
            </Label>
            <Input
              id="vehicle-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. White, Black, Silver..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-model" className="text-sm text-muted-foreground">
              Model
            </Label>
            <Input
              id="vehicle-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Toyota Camry 2022"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-plate" className="text-sm text-muted-foreground">
              License Plate
            </Label>
            <Input
              id="vehicle-plate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. ABC-1234"
              className="uppercase"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saveMutation.isPending || !hasChanges}
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Vehicle Info
          </>
        )}
      </Button>
    </div>
  );
}
