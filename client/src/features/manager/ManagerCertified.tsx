import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Circle, Award, BookOpen } from "lucide-react";
import { SectionHeader, SkeletonCard, CertifiedBadge } from "@/features/shared/components";

// ─── Types ───
interface VendorCertData {
  rating: number;
  completion_rate: number;
  training_completed: boolean;
  quality_passed: boolean;
  certified: boolean;
}

// ─── Mock data ───
const MOCK_CERT: VendorCertData = {
  rating: 4.8,
  completion_rate: 0.96,
  training_completed: true,
  quality_passed: true,
  certified: true,
};

// ─── Criteria definitions ───
interface CriterionDef {
  label: string;
  description: string;
  check: (v: VendorCertData) => boolean;
  value: (v: VendorCertData) => string;
}

const CRITERIA: CriterionDef[] = [
  {
    label: "4.7+ Rating",
    description: "Maintain an average customer rating of 4.7 or higher.",
    check: (v) => v.rating >= 4.7,
    value: (v) => `Current: ${v.rating.toFixed(1)}`,
  },
  {
    label: "90%+ Completion",
    description: "Complete at least 90% of accepted orders on time.",
    check: (v) => v.completion_rate >= 0.9,
    value: (v) => `Current: ${(v.completion_rate * 100).toFixed(0)}%`,
  },
  {
    label: "Training Completed",
    description: "Complete the Offload vendor onboarding and quality training.",
    check: (v) => v.training_completed,
    value: (v) => v.training_completed ? "Completed" : "Incomplete",
  },
  {
    label: "Quality Standards Met",
    description: "Pass the most recent quality inspection with no critical findings.",
    check: (v) => v.quality_passed,
    value: (v) => v.quality_passed ? "Passed" : "Not yet passed",
  },
];

export default function ManagerCertified() {
  const { data: certData, isLoading } = useQuery<VendorCertData>({
    queryKey: ["/api/vendors/me/certification"],
    retry: false,
    queryFn: async () => {
      try {
        const { apiRequest } = await import("@/lib/queryClient");
        const res = await apiRequest("GET", "/api/vendors/me/certification");
        return await res.json();
      } catch {
        return MOCK_CERT;
      }
    },
  });

  const v = certData ?? MOCK_CERT;
  const allPassed = CRITERIA.every((c) => c.check(v));

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 max-w-4xl mx-auto">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader title="Certified Status" />

      {/* ─── Status Banner ─── */}
      <div className={`rounded-xl p-4 border ${
        allPassed
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-card border-border"
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <Award className={`w-8 h-8 ${allPassed ? "text-orange-400" : "text-muted-foreground"}`} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">
                {allPassed ? "You are Offload Certified!" : "Certification Progress"}
              </h2>
              {allPassed && <CertifiedBadge />}
            </div>
            <p className="text-sm text-muted-foreground">
              {allPassed
                ? "Congratulations! You meet all certification criteria."
                : "Complete all criteria below to earn your Offload Certified badge."}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Criteria Checklist ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <SectionHeader title="Certification Criteria" />
        <div className="space-y-4">
          {CRITERIA.map((criterion, idx) => {
            const passed = criterion.check(v);
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {passed ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${passed ? "text-green-400" : "text-foreground"}`}>
                      {criterion.label}
                    </p>
                    <span className={`text-xs font-medium ${passed ? "text-green-400" : "text-muted-foreground"}`}>
                      {criterion.value(v)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── How to Maintain Certification ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">How to Maintain Certification</h3>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            The Offload Certified badge signals to customers that your facility meets the
            highest standards of service quality, reliability, and care. Here is how to keep it:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-1">
            <li>
              <span className="font-medium text-foreground">Consistent Quality:</span>{" "}
              Maintain a 4.7+ star rating by delivering clean, well-folded laundry every time.
              Address any customer complaints promptly and professionally.
            </li>
            <li>
              <span className="font-medium text-foreground">Reliable Completion:</span>{" "}
              Keep your on-time completion rate above 90%. If you cannot fulfill an order, decline
              it early rather than missing the deadline.
            </li>
            <li>
              <span className="font-medium text-foreground">Ongoing Training:</span>{" "}
              Complete any new training modules as they are released. Offload periodically
              updates best practices for handling delicates, stain treatment, and packaging.
            </li>
            <li>
              <span className="font-medium text-foreground">Quality Audits:</span>{" "}
              Pass periodic quality inspections. These checks ensure your facility meets hygiene,
              equipment, and process standards.
            </li>
            <li>
              <span className="font-medium text-foreground">Review Period:</span>{" "}
              Certification is reviewed monthly. If any criterion falls below the threshold,
              you will receive a 30-day grace period to bring it back into compliance before
              the badge is removed.
            </li>
          </ul>
          <p>
            Questions about certification? Contact{" "}
            <a
              href="mailto:support@offloadusa.com"
              className="text-primary underline hover:text-primary/80"
            >
              support@offloadusa.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
