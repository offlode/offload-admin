import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Phone, Mail, MapPin, FileText, ShieldCheck } from "lucide-react";

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending_review: { label: "Pending review", variant: "default" },
  auto_flagged: { label: "Auto-flagged", variant: "secondary" },
  approved: { label: "Approved", variant: "outline" },
  declined: { label: "Declined", variant: "destructive" },
};

const flagDescriptions: Record<string, string> = {
  missing_quality_standards_ack: "Did not agree to quality standards",
  missing_pricing_ack: "Did not agree to pricing terms",
  missing_tos_ack: "Did not agree to Terms of Service",
  missing_background_check_ack: "Did not authorize background check",
  missing_contact: "Missing contact info",
  bad_email: "Invalid email format",
  missing_vehicle_type: "Vehicle type not provided",
  missing_license_plate: "License plate missing",
  missing_dl_number: "Driver's license number missing",
  missing_dl_expiry: "Driver's license expiry missing",
  missing_insurance: "Insurance info incomplete",
  no_clean_driving_record: "No clean driving record",
  no_smartphone: "No smartphone",
  no_bg_consent: "No background check consent",
  dl_expiring_soon: "Driver's license expires within 6 months",
  insurance_expiring_soon: "Insurance expires within 30 days",
  low_driving_experience: "Less than 1 year driving experience",
  low_hours_committed: "Less than 10 hours/week committed",
  missing_business_name: "Business name missing",
  missing_ein: "EIN missing",
  missing_business_address: "Business address incomplete",
  insufficient_washers: "Fewer than 4 washers",
  insufficient_dryers: "Fewer than 4 dryers",
  low_capacity: "Daily capacity below 200 lbs",
  missing_operating_hours: "Operating hours not provided",
  missing_services_offered: "Services offered not selected",
  missing_business_insurance: "No business insurance",
  missing_insurance_carrier: "Insurance carrier not specified",
  new_business: "Less than 1 year in business",
};

function Field({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm">{String(value)}</p>
    </div>
  );
}

function YesNo({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm">
        {value === 1 || value === true ? (
          <span className="text-green-500 font-medium">✓ Yes</span>
        ) : value === 0 || value === false ? (
          <span className="text-red-500 font-medium">✗ No</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </p>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineReasonError, setDeclineReasonError] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [tempPwResult, setTempPwResult] = useState<string | null>(null);

  const { data: app, isLoading } = useQuery<any>({
    queryKey: [`/api/admin/partner-applications/${params.id}`],
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/admin/partner-applications/${params.id}/approve`, { notes: approveNotes });
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: "Approved", description: `Welcome email sent to ${app?.email}.` });
      setApproveOpen(false);
      setApproveNotes("");
      if (data?.tempPassword) setTempPwResult(data.tempPassword);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/partner-applications/${params.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-applications/stats/summary"] });
    },
    onError: (err: any) => {
      toast({ title: "Approval failed", description: err.message || "Try again.", variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/admin/partner-applications/${params.id}/decline`, { reason: declineReason });
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Declined", description: "Applicant notified by email." });
      setDeclineOpen(false);
      setDeclineReason("");
      queryClient.invalidateQueries({ queryKey: [`/api/admin/partner-applications/${params.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-applications/stats/summary"] });
    },
    onError: (err: any) => {
      toast({ title: "Decline failed", description: err.message || "Try again.", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!app) return <div className="p-8 text-sm text-muted-foreground">Application not found.</div>;

  const flagsArr: string[] = (() => { try { return app.autoScreenFlags ? JSON.parse(app.autoScreenFlags) : []; } catch { return []; } })();
  const decided = app.status === "approved" || app.status === "declined";
  const isDriver = app.applicantType === "driver";

  let services: string[] = [];
  try { if (app.servicesOfferedJson) services = JSON.parse(app.servicesOfferedJson); } catch {}
  let hours: any = null;
  try { if (app.operatingHoursJson) hours = JSON.parse(app.operatingHoursJson); } catch {}

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/applications")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> All applications
          </Button>
          <h1 className="text-xl font-semibold tracking-tight mt-2">
            {app.fullName} <span className="text-muted-foreground font-normal">· {app.applicantType}</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={statusBadge[app.status]?.variant || "outline"}>
              {statusBadge[app.status]?.label || app.status}
            </Badge>
            <span className="text-xs text-muted-foreground">Submitted {new Date(app.createdAt).toLocaleString()}</span>
          </div>
        </div>
        {!decided && (
          <div className="flex gap-2">
            <Button
              onClick={() => setApproveOpen(true)}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-approve"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              onClick={() => setDeclineOpen(true)}
              variant="destructive"
              data-testid="button-decline"
            >
              <XCircle className="h-4 w-4 mr-1" /> Decline
            </Button>
          </div>
        )}
      </div>

      {/* Auto-screen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Auto-screening
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className={`text-2xl font-semibold ${(app.autoScreenScore || 0) >= 85 ? "text-green-500" : (app.autoScreenScore || 0) >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                {app.autoScreenScore ?? "—"}/100
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recommendation</p>
              <p className="text-sm font-medium capitalize">{app.autoScreenRecommendation || "—"}</p>
            </div>
          </div>
          {flagsArr.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" /> Flags ({flagsArr.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {flagsArr.map(f => (
                  <Badge key={f} variant="secondary" className="text-xs font-normal">
                    {flagDescriptions[f] || f}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Contact</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 text-muted-foreground" /><Field label="Email" value={app.email} /></div>
          <div className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-muted-foreground" /><Field label="Phone" value={app.phone} /></div>
          {(app.addressLine || app.city) && (
            <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" /><Field label="Address" value={[app.addressLine, app.city, app.state, app.zip].filter(Boolean).join(", ")} /></div>
          )}
        </CardContent>
      </Card>

      {isDriver ? (
        <>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Vehicle &amp; License</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Vehicle type" value={app.vehicleType} />
              <Field label="License plate" value={app.licensePlate} />
              <Field label="Years driving" value={app.yearsDriving} />
              <Field label="DL number" value={app.driversLicenseNumber} />
              <Field label="DL state" value={app.driversLicenseState} />
              <Field label="DL expiry" value={app.driversLicenseExpiry} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Insurance</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Carrier" value={app.insuranceCarrier} />
              <Field label="Policy #" value={app.insurancePolicyNumber} />
              <Field label="Expiry" value={app.insuranceExpiry} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Availability &amp; Eligibility</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Hours/week" value={app.hoursPerWeek} />
              <YesNo label="Owns smartphone" value={app.ownsSmartphone} />
              <YesNo label="Clean driving record" value={app.hasCleanDrivingRecord} />
              <YesNo label="Background check consent" value={app.consentBackgroundCheck} />
              {app.availabilityJson && <Field label="Schedule note" value={(() => { try { return JSON.parse(app.availabilityJson).note; } catch { return app.availabilityJson; } })()} />}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Business</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field label="Business name" value={app.businessName} />
              <Field label="Legal entity" value={app.businessLegalEntity} />
              <Field label="EIN" value={app.ein} />
              <Field label="Years in business" value={app.yearsInBusiness} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Equipment &amp; Capacity</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Washers" value={app.numberOfWashers} />
              <Field label="Dryers" value={app.numberOfDryers} />
              <Field label="Largest machine (lbs)" value={app.largestMachineLbs} />
              <Field label="Daily capacity (lbs)" value={app.dailyCapacityLbs} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Services &amp; Hours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {services.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Services offered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map(s => <Badge key={s} variant="outline" className="text-xs capitalize">{s.replace(/_/g, " ")}</Badge>)}
                  </div>
                </div>
              )}
              {hours && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Operating hours</p>
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-2 text-xs">
                    {["mon","tue","wed","thu","fri","sat","sun"].map(d => (
                      <div key={d} className="border rounded p-2">
                        <p className="font-medium uppercase mb-0.5">{d}</p>
                        <p className="text-muted-foreground">{hours[d] ? `${hours[d].open} – ${hours[d].close}` : "Closed"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <YesNo label="Commercial accounts" value={app.acceptsCommercial} />
                <YesNo label="Same-day rush" value={app.acceptsRushSameDay} />
                <YesNo label="Dry cleaning on-site" value={app.hasDryCleaningOnSite} />
                <YesNo label="Hypoallergenic" value={app.acceptsHypoallergenic} />
                <YesNo label="Has insurance" value={app.hasInsurance} />
                <Field label="Insurance carrier" value={app.insuranceCarrierBiz} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Acknowledgements */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Acknowledgements</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <YesNo label="Quality standards" value={app.agreesToQualityStandards} />
          <YesNo label="Pricing terms" value={app.agreesToPricing} />
          <YesNo label="Terms of service" value={app.agreesToTermsOfService} />
          <YesNo label="Background check" value={app.agreesToBackgroundCheck} />
        </CardContent>
      </Card>

      {(app.whyJoin || app.references) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Free-form</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {app.whyJoin && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Why join</p>
                <p className="text-sm whitespace-pre-wrap">{app.whyJoin}</p>
              </div>
            )}
            {app.references && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">References</p>
                <p className="text-sm whitespace-pre-wrap">{app.references}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Decision history */}
      {decided && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Decision</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Reviewed at: <span className="text-muted-foreground">{app.reviewedAt ? new Date(app.reviewedAt).toLocaleString() : "—"}</span></p>
            {app.declineReason && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Decline reason</p>
                <p>{app.declineReason}</p>
              </div>
            )}
            {app.resultUserId && <p>Created user ID: <span className="text-muted-foreground">{app.resultUserId}</span></p>}
            {app.resultDriverId && <p>Driver ID: <span className="text-muted-foreground">{app.resultDriverId}</span></p>}
            {app.resultVendorId && <p>Vendor ID: <span className="text-muted-foreground">{app.resultVendorId}</span></p>}
          </CardContent>
        </Card>
      )}

      {/* Decline modal */}
      {/* Approve confirmation modal */}
      <Dialog open={approveOpen} onOpenChange={(o) => { setApproveOpen(o); if (!o) setApproveNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Add internal notes for this approval (optional but recommended for audit trail).
            </p>
            <Textarea
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="e.g. Reviewed manually — all documentation verified. High capacity, strong score."
              rows={4}
              data-testid="textarea-approve-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveOpen(false); setApproveNotes(""); }}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving…" : "Approve & notify applicant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline modal */}
      <Dialog open={declineOpen} onOpenChange={(o) => { setDeclineOpen(o); if (!o) { setDeclineReason(""); setDeclineReasonError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline application</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              The applicant will receive an email with this reason. Be specific and respectful.
            </p>
            <Textarea
              value={declineReason}
              onChange={(e) => { setDeclineReason(e.target.value); if (e.target.value.trim().length >= 10) setDeclineReasonError(""); }}
              placeholder="e.g. Insurance documentation does not meet our minimum coverage requirements."
              rows={5}
              data-testid="textarea-decline-reason"
              className={declineReasonError ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {declineReasonError && (
              <p className="text-xs text-red-500" data-testid="error-decline-reason">{declineReasonError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeclineOpen(false); setDeclineReason(""); setDeclineReasonError(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!declineReason.trim()) {
                  setDeclineReasonError("A decline reason is required.");
                  return;
                }
                if (declineReason.trim().length < 10) {
                  setDeclineReasonError("Please provide at least 10 characters explaining the reason.");
                  return;
                }
                declineMutation.mutate();
              }}
              disabled={declineMutation.isPending}
              data-testid="button-confirm-decline"
            >
              {declineMutation.isPending ? "Sending…" : "Decline & notify applicant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval result modal — show temp password */}
      <Dialog open={!!tempPwResult} onOpenChange={(o) => !o && setTempPwResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application approved</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">A welcome email has been sent to <strong>{app.email}</strong>.</p>
            <div className="bg-muted/50 p-3 rounded">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Temporary password (also in email)</p>
              <code className="text-sm font-mono">{tempPwResult}</code>
            </div>
            <p className="text-xs text-muted-foreground">
              The applicant should sign in and change their password on first login.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPwResult(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
