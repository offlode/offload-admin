import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  Camera,
  CheckCircle,
  ChevronRight,
  Scale,
  Scissors,
  Timer,
  Package,
  ArrowLeft,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CLOTHING_TYPES } from "@/features/shared/types";
import type { WashPreferences } from "@/features/shared/types";
import { SkeletonCard, StatusPill } from "@/features/shared/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

// ─── Types ───

interface OrderBag {
  id: number;
  size: string;
  weight_lbs: number | null;
}

interface OrderDetail {
  id: number;
  order_number: string;
  customer_name: string;
  status: string;
  display_status: string;
  bags: OrderBag[];
  preferences: WashPreferences | null;
  separated: boolean;
  wash_run_id: number | null;
}

interface BagWeightEntry {
  weight: string;
  photo: File | null;
}

// ─── Step Indicator ───

const STEPS = [
  { num: 1, label: "Weigh", icon: Scale },
  { num: 2, label: "Separate", icon: Scissors },
  { num: 3, label: "Wash", icon: Timer },
  { num: 4, label: "Timer", icon: Timer },
  { num: 5, label: "Done", icon: Camera },
  { num: 6, label: "Verify", icon: CheckCircle },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEPS.map((step, idx) => {
        const isActive = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        const Icon = step.icon;

        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors
                  ${isCompleted ? "bg-green-500 border-green-500 text-white" : ""}
                  ${isActive ? "bg-primary border-primary text-primary-foreground" : ""}
                  ${!isCompleted && !isActive ? "bg-transparent border-muted-foreground/30 text-muted-foreground" : ""}
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 ${
                  isActive
                    ? "text-primary font-semibold"
                    : isCompleted
                      ? "text-green-500"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-4 sm:w-6 h-0.5 mx-0.5 mt-[-14px] ${
                  step.num < currentStep ? "bg-green-500" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Wash run type for polling ───
interface WashRunStatus {
  id: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

// ─── Main Component ───

export default function OperatorWashRun() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // ─── State ───
  const [step, setStep] = useState(1);
  const [bagEntries, setBagEntries] = useState<Record<number, BagWeightEntry>>({});
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState<number>(45);
  const [washRunId, setWashRunId] = useState<number | null>(null);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [completedPhoto, setCompletedPhoto] = useState<File | null>(null);
  const [finalWeight, setFinalWeight] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch order ───
  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["/api/orders", orderId],
    enabled: !!orderId,
  });

  // Poll wash run status for the countdown timer
  const { data: washRunData } = useQuery<WashRunStatus>({
    queryKey: ["/api/wash-runs", washRunId],
    enabled: !!washRunId && step === 4,
    refetchInterval: 10000,
  });

  const data = order ?? {
    id: 0,
    order_number: "---",
    customer_name: "Loading...",
    status: "pending",
    display_status: "Pending",
    bags: [],
    preferences: null,
    separated: false,
    wash_run_id: null,
  };

  // Initialize bag entries when order loads
  useEffect(() => {
    if (data.bags.length > 0 && Object.keys(bagEntries).length === 0) {
      const initial: Record<number, BagWeightEntry> = {};
      data.bags.forEach((bag) => {
        initial[bag.id] = { weight: bag.weight_lbs?.toString() ?? "", photo: null };
      });
      setBagEntries(initial);
    }
  }, [data.bags, bagEntries]);

  // Auto-skip Step 2 if not separated
  useEffect(() => {
    if (step === 2 && !data.separated) {
      setStep(3);
    }
  }, [step, data.separated]);

  // ─── Timer logic ───
  useEffect(() => {
    if (step === 4 && timerEnd !== null) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerEnd - now) / 1000));
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStep(5);
          toast({ title: "Wash complete!", description: "Time to fold and package." });
        }
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [step, timerEnd, toast]);

  // ─── Mutations ───
  const startWashMutation = useMutation({
    mutationFn: async () => {
      // Compute total weight from bag entries
      const totalWeight = Object.values(bagEntries).reduce(
        (sum, e) => sum + (parseFloat(e.weight) || 0),
        0
      );
      // Determine wash type from preferences or selected types
      const hasWhites = selectedTypes.has("Whites");
      const washType = hasWhites ? "hot" : "cold";
      const clothingCategory = Array.from(selectedTypes).join(", ") || "mixed";

      const res = await apiRequest("POST", "/api/wash-runs", {
        orderId: Number(orderId),
        washType,
        clothingCategory,
        weightLbs: totalWeight,
        notes: `Duration: ${duration}min. Types: ${clothingCategory}`,
      });
      return res.json();
    },
    onSuccess: (result: { id: number }) => {
      setWashRunId(result.id);
      const endTime = Date.now() + duration * 60 * 1000;
      setTimerEnd(endTime);
      setRemainingSeconds(duration * 60);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({ title: "Wash started", description: `${duration} minute cycle.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start wash run. Please try again." });
    },
  });

  const completeWashMutation = useMutation({
    mutationFn: async () => {
      const runId = washRunId ?? data.wash_run_id;
      // Step 5 collects the weight; use it or fallback to bag total
      const afterWeight = finalWeight
        ? parseFloat(finalWeight)
        : Object.values(bagEntries).reduce(
            (sum, e) => sum + (parseFloat(e.weight) || 0),
            0
          );
      await apiRequest("POST", `/api/wash-runs/${runId}/complete`, {
        weightAfterLbs: afterWeight,
        folded_photo_url: completedPhoto ? "pending_upload" : undefined,
      });
    },
    onSuccess: () => {
      setStep(6);
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({ title: "Marked complete", description: "Order folded & packaged." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete wash run." });
    },
  });

  const verifyWeightMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/orders/${orderId}/final-weight`, {
        finalWeightLbs: parseFloat(finalWeight),
        notes: "Weight within tolerance",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      toast({ title: "Weight verified", description: "Order is complete!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to verify weight." });
    },
  });

  // ─── Handlers ───
  const updateBagEntry = useCallback(
    (bagId: number, field: keyof BagWeightEntry, value: string | File | null) => {
      setBagEntries((prev) => ({
        ...prev,
        [bagId]: { ...prev[bagId], [field]: value },
      }));
    },
    []
  );

  const toggleClothingType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleCompleteEarly = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingSeconds(0);
    setStep(5);
  }, []);

  // ─── Validation ───
  const allBagsComplete = data.bags.every((bag) => {
    const entry = bagEntries[bag.id];
    return entry && entry.weight.trim() !== "" && parseFloat(entry.weight) > 0 && entry.photo !== null;
  });

  // Timer display
  const timerMinutes = Math.floor(remainingSeconds / 60);
  const timerSeconds = remainingSeconds % 60;
  const timerTotalSeconds = duration * 60;
  const timerProgress =
    timerTotalSeconds > 0
      ? ((timerTotalSeconds - remainingSeconds) / timerTotalSeconds) * 100
      : 0;

  // ─── Loading ───
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
        <SkeletonCard />
        <div className="mt-4">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/operator/queue")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{data.order_number}</h1>
          <p className="text-sm text-muted-foreground">{data.customer_name}</p>
        </div>
        <StatusPill status={data.status} label={data.display_status} />
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step} />

      {/* ─── Step 1: Weigh & Photo ─── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Weigh & Photo Each Bag</h2>
          <p className="text-sm text-muted-foreground">
            Enter weight and take a photo of each bag before washing.
          </p>

          {data.bags.map((bag) => {
            const entry = bagEntries[bag.id] ?? { weight: "", photo: null };
            return (
              <div
                key={bag.id}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    Bag #{bag.id} &middot; {bag.size}
                  </span>
                  {entry.weight && entry.photo && (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </div>

                <div>
                  <Label htmlFor={`weight-${bag.id}`} className="text-xs text-muted-foreground">
                    Weight (lbs)
                  </Label>
                  <Input
                    id={`weight-${bag.id}`}
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0.0"
                    value={entry.weight}
                    onChange={(e) => updateBagEntry(bag.id, "weight", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor={`photo-${bag.id}`} className="text-xs text-muted-foreground">
                    Bag Photo
                  </Label>
                  <Input
                    id={`photo-${bag.id}`}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      updateBagEntry(bag.id, "photo", file);
                    }}
                    className="mt-1"
                  />
                  {entry.photo && (
                    <p className="text-xs text-green-500 mt-1">
                      {entry.photo.name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <Button
            className="w-full"
            disabled={!allBagsComplete}
            onClick={() => setStep(2)}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ─── Step 2: Separate by Type ─── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Separate by Clothing Type</h2>
          <p className="text-sm text-muted-foreground">
            Check off each clothing type as you separate them.
          </p>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3">
              {CLOTHING_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTypes.has(type)}
                    onCheckedChange={() => toggleClothingType(type)}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={() => setStep(3)}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* ─── Step 3: Start Washing ─── */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Start Washing</h2>
          <p className="text-sm text-muted-foreground">
            Select wash duration and start the cycle.
          </p>

          {/* Preferences summary */}
          {data.preferences && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Customer Preferences</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Detergent:</span>
                <span>{data.preferences.detergent}</span>
                <span className="text-muted-foreground">Water Temp:</span>
                <span>{data.preferences.water_temp}</span>
                <span className="text-muted-foreground">Drying:</span>
                <span>{data.preferences.drying}</span>
              </div>
              {data.preferences.stain_treatment && (
                <span className="inline-block bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
                  Stain Treatment
                </span>
              )}
              {data.preferences.extra_rinse && (
                <span className="inline-block bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full ml-1">
                  Extra Rinse
                </span>
              )}
              {data.preferences.delicate_wash && (
                <span className="inline-block bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full ml-1">
                  Delicate Wash
                </span>
              )}
              {data.preferences.special_instructions && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  &ldquo;{data.preferences.special_instructions}&rdquo;
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
      )}

      {/* ─── Step 4: Live Countdown Timer ─── */}
      {step === 4 && (
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
            onClick={handleCompleteEarly}
          >
            Complete Early
          </Button>
        </div>
      )}

      {/* ─── Step 5: Mark Done ─── */}
      {step === 5 && (
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
      )}

      {/* ─── Step 6: Final Weight Verified ─── */}
      {step === 6 && (
        <div className="space-y-4">
          {verifyWeightMutation.isSuccess ? (
            /* Success state */
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold">Order Complete!</h2>
              <p className="text-sm text-muted-foreground">
                {data.order_number} has been processed and verified.
              </p>
              <Button
                className="w-full mt-4"
                onClick={() => navigate("/operator/queue")}
              >
                Back to Queue
              </Button>
            </div>
          ) : (
            /* Weight entry */
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
