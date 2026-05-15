import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { OrderDetail } from "./hooks/useWashRun";

export function WashStep({
  preferences,
  duration,
  setDuration,
  startWashMutation,
}: {
  preferences: OrderDetail["preferences"];
  duration: number;
  setDuration: (d: number) => void;
  startWashMutation: any;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Start Washing</h2>
      <p className="text-sm text-muted-foreground">
        Select wash duration and start the cycle.
      </p>

      {/* Preferences summary */}
      {preferences && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Customer Preferences</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Detergent:</span>
            <span>{preferences.detergent}</span>
            <span className="text-muted-foreground">Water Temp:</span>
            <span>{preferences.water_temp}</span>
            <span className="text-muted-foreground">Drying:</span>
            <span>{preferences.drying}</span>
          </div>
          {preferences.stain_treatment && (
            <span className="inline-block bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
              Stain Treatment
            </span>
          )}
          {preferences.extra_rinse && (
            <span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full ml-1">
              Extra Rinse
            </span>
          )}
          {preferences.delicate_wash && (
            <span className="inline-block bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full ml-1">
              Delicate Wash
            </span>
          )}
          {preferences.special_instructions && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              &ldquo;{preferences.special_instructions}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Duration picker */}
      <div>
        <Label className="text-sm font-medium">Wash Duration</Label>
        <div className="flex gap-3 mt-2">
          {[30, 45, 60].map((min) => (
            <button
              key={min}
              onClick={() => setDuration(min)}
              className={`
                flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors
                ${
                  duration === min
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border text-foreground hover:border-primary/50"
                }
              `}
            >
              {min} min
            </button>
          ))}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => startWashMutation.mutate()}
        disabled={startWashMutation.isPending}
      >
        {startWashMutation.isPending ? "Starting..." : "Start Wash"}
      </Button>
    </div>
  );
}

export function TimerStep({
  timerMinutes,
  timerSeconds,
  timerProgress,
  duration,
  onCompleteEarly,
}: {
  timerMinutes: number;
  timerSeconds: number;
  timerProgress: number;
  duration: number;
  onCompleteEarly: () => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-center">Washing In Progress</h2>

      {/* Timer display */}
      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-6">
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Circular progress background */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted-foreground/20"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 54}
              strokeDashoffset={2 * Math.PI * 54 * (1 - timerProgress / 100)}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold">
              {String(timerMinutes).padStart(2, "0")}:
              {String(timerSeconds).padStart(2, "0")}
            </span>
            <span className="text-xs text-muted-foreground mt-1">remaining</span>
          </div>
        </div>

        {/* Linear progress bar */}
        <div className="w-full">
          <Progress value={timerProgress} className="h-2" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">0:00</span>
            <span className="text-xs text-muted-foreground">{duration}:00</span>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={onCompleteEarly}
      >
        Complete Early
      </Button>
    </div>
  );
}

export function FoldStep({
  completedPhoto,
  setCompletedPhoto,
  completeWashMutation,
}: {
  completedPhoto: File | null;
  setCompletedPhoto: (f: File | null) => void;
  completeWashMutation: any;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Fold & Package</h2>
      <p className="text-sm text-muted-foreground">
        Take a photo of the folded and packaged laundry, then mark as complete.
      </p>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Label htmlFor="completed-photo" className="text-sm font-medium">
          Folded/Packaged Photo
        </Label>
        <Input
          id="completed-photo"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setCompletedPhoto(e.target.files?.[0] ?? null)}
        />
        {completedPhoto && (
          <div className="flex items-center gap-2 text-green-500 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>{completedPhoto.name}</span>
          </div>
        )}
      </div>

      <Button
        className="w-full"
        disabled={!completedPhoto || completeWashMutation.isPending}
        onClick={() => completeWashMutation.mutate()}
      >
        {completeWashMutation.isPending ? "Completing..." : "Mark Complete"}
      </Button>
    </div>
  );
}

export function VerifyStep({
  orderNumber,
  finalWeight,
  setFinalWeight,
  verifyWeightMutation,
  onBackToQueue,
}: {
  orderNumber: string;
  finalWeight: string;
  setFinalWeight: (v: string) => void;
  verifyWeightMutation: any;
  onBackToQueue: () => void;
}) {
  if (verifyWeightMutation.isSuccess) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold">Order Complete!</h2>
        <p className="text-sm text-muted-foreground">
          {orderNumber} has been processed and verified.
        </p>
        <Button
          className="w-full mt-4"
          onClick={onBackToQueue}
        >
          Back to Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Verify Final Weight</h2>
      <p className="text-sm text-muted-foreground">
        Enter the total final weight of the completed order.
      </p>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Label htmlFor="final-weight" className="text-sm font-medium">
          Final Weight (lbs)
        </Label>
        <Input
          id="final-weight"
          type="number"
          step="0.1"
          min="0"
          placeholder="0.0"
          value={finalWeight}
          onChange={(e) => setFinalWeight(e.target.value)}
        />
      </div>

      <Button
        className="w-full"
        disabled={
          !finalWeight.trim() ||
          parseFloat(finalWeight) <= 0 ||
          verifyWeightMutation.isPending
        }
        onClick={() => verifyWeightMutation.mutate()}
      >
        {verifyWeightMutation.isPending
          ? "Verifying..."
          : "Verify Final Weight"}
      </Button>
    </div>
  );
}
