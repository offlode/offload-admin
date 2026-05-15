import {
  Camera,
  CheckCircle,
  Scale,
  Scissors,
  Timer,
} from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { SkeletonCard, StatusPill } from "@/features/shared/components";
import { Button } from "@/components/ui/button";

import { useWashRun } from "./hooks/useWashRun";
import { WeighStep, SeparateStep } from "./WashRunWeighing";
import { WashStep, TimerStep, FoldStep, VerifyStep } from "./WashRunPhotos";

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

// ─── Main Component ───

export default function OperatorWashRun() {
  const {
    navigate,
    data,
    isLoading,
    step, setStep,
    bagEntries, updateBagEntry,
    selectedTypes, toggleClothingType,
    duration, setDuration,
    timerMinutes, timerSeconds, timerProgress,
    completedPhoto, setCompletedPhoto,
    finalWeight, setFinalWeight,
    startWashMutation,
    completeWashMutation,
    verifyWeightMutation,
    handleCompleteEarly,
    allBagsComplete,
  } = useWashRun();

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
        <WeighStep
          bags={data.bags}
          bagEntries={bagEntries}
          updateBagEntry={updateBagEntry}
          allBagsComplete={allBagsComplete}
          onNext={() => setStep(2)}
        />
      )}

      {/* ─── Step 2: Separate by Type ─── */}
      {step === 2 && (
        <SeparateStep
          selectedTypes={selectedTypes}
          toggleClothingType={toggleClothingType}
          onNext={() => setStep(3)}
        />
      )}

      {/* ─── Step 3: Start Washing ─── */}
      {step === 3 && (
        <WashStep
          preferences={data.preferences}
          duration={duration}
          setDuration={setDuration}
          startWashMutation={startWashMutation}
        />
      )}

      {/* ─── Step 4: Live Countdown Timer ─── */}
      {step === 4 && (
        <TimerStep
          timerMinutes={timerMinutes}
          timerSeconds={timerSeconds}
          timerProgress={timerProgress}
          duration={duration}
          onCompleteEarly={handleCompleteEarly}
        />
      )}

      {/* ─── Step 5: Mark Done ─── */}
      {step === 5 && (
        <FoldStep
          completedPhoto={completedPhoto}
          setCompletedPhoto={setCompletedPhoto}
          completeWashMutation={completeWashMutation}
        />
      )}

      {/* ─── Step 6: Final Weight Verified ─── */}
      {step === 6 && (
        <VerifyStep
          orderNumber={data.order_number}
          finalWeight={finalWeight}
          setFinalWeight={setFinalWeight}
          verifyWeightMutation={verifyWeightMutation}
          onBackToQueue={() => navigate("/operator/queue")}
        />
      )}
    </div>
  );
}
