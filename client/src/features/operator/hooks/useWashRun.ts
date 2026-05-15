import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Types ───

export interface OrderBag {
  id: number;
  size: string;
  weight_lbs: number | null;
}

export interface WashPreferences {
  detergent: string;
  water_temp: string;
  drying: string;
  stain_treatment?: boolean;
  extra_rinse?: boolean;
  delicate_wash?: boolean;
  special_instructions?: string;
}

export interface OrderDetail {
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

export interface BagWeightEntry {
  weight: string;
  photo: File | null;
}

interface WashRunStatus {
  id: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export function useWashRun() {
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
      const totalWeight = Object.values(bagEntries).reduce(
        (sum, e) => sum + (parseFloat(e.weight) || 0),
        0
      );
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

  return {
    orderId,
    navigate,
    data,
    isLoading,
    step, setStep,
    bagEntries, updateBagEntry,
    selectedTypes, toggleClothingType,
    duration, setDuration,
    remainingSeconds,
    timerMinutes, timerSeconds, timerProgress,
    completedPhoto, setCompletedPhoto,
    finalWeight, setFinalWeight,
    startWashMutation,
    completeWashMutation,
    verifyWeightMutation,
    handleCompleteEarly,
    allBagsComplete,
  };
}
