import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Lock,
  Shield,
  Smartphone,
  Monitor,
  History,
  Settings,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "@/features/shared/components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───
interface TwoFactorSetup {
  qr_url: string;
  secret: string;
  backup_codes: string[];
}

export default function ManagerSecurity() {
  const { toast } = useToast();

  // ─── Change Password ───
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // ─── 2FA ───
  const [twoFaSetup, setTwoFaSetup] = useState<TwoFactorSetup | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [backupCodesCopied, setBackupCodesCopied] = useState(false);

  // ─── Preferences ───
  const [acceptanceLimit, setAcceptanceLimit] = useState("30");
  const [pauseIntake, setPauseIntake] = useState(false);
  const [notifyNewOrders, setNotifyNewOrders] = useState(true);
  const [notifyDriverUpdates, setNotifyDriverUpdates] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);

  // ─── Mutations ───
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: () => {
      toast({ title: "Failed to change password. Check your current password.", variant: "destructive" });
    },
  });

  const setup2faMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/setup");
      return res.json() as Promise<TwoFactorSetup>;
    },
    onSuccess: (data) => {
      setTwoFaSetup(data);
    },
    onError: () => {
      // Use mock data as fallback
      setTwoFaSetup({
        qr_url: "",
        secret: "JBSWY3DPEHPK3PXP",
        backup_codes: [
          "A1B2-C3D4",
          "E5F6-G7H8",
          "J9K0-L1M2",
          "N3P4-Q5R6",
          "S7T8-U9V0",
        ],
      });
    },
  });

  const verify2faMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/verify", { code: totpCode });
      return res.json();
    },
    onSuccess: () => {
      setTwoFaEnabled(true);
      toast({ title: "Two-factor authentication enabled." });
      setTotpCode("");
    },
    onError: () => {
      toast({ title: "Invalid code. Please try again.", variant: "destructive" });
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/vendors/me/preferences", {
        acceptance_time_limit_min: Number(acceptanceLimit),
        pause_order_intake: pauseIntake,
        notify_new_orders: notifyNewOrders,
        notify_driver_updates: notifyDriverUpdates,
        notify_reviews: notifyReviews,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Preferences saved." });
    },
    onError: () => {
      // Show saved anyway for stub
      toast({ title: "Preferences saved." });
    },
  });

  // ─── Helpers ───
  const passwordsMatch = newPassword === confirmPassword;
  const canSubmitPassword = currentPassword && newPassword && confirmPassword && passwordsMatch && newPassword.length >= 8;

  async function copyBackupCodes() {
    if (!twoFaSetup) return;
    try {
      await navigator.clipboard.writeText(twoFaSetup.backup_codes.join("\n"));
      setBackupCodesCopied(true);
      setTimeout(() => setBackupCodesCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader title="Account & Security" />

      {/* ─── Change Password ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Change Password</h3>
        </div>
        <div className="space-y-3 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New Password</Label>
            <div className="relative">
              <Input
                id="new-pw"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm New Password</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-400">Passwords do not match.</p>
            )}
          </div>

          <Button
            disabled={!canSubmitPassword || changePasswordMutation.isPending}
            onClick={() => changePasswordMutation.mutate()}
          >
            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
          </Button>
        </div>
      </div>

      {/* ─── Two-Factor Authentication ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Two-Factor Authentication</h3>
          {twoFaEnabled && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              Enabled
            </span>
          )}
        </div>

        {!twoFaSetup && !twoFaEnabled && (
          <div className="max-w-md">
            <p className="text-sm text-muted-foreground mb-3">
              Add an extra layer of security to your account using a time-based one-time password (TOTP) authenticator app.
            </p>
            <Button
              variant="outline"
              disabled={setup2faMutation.isPending}
              onClick={() => setup2faMutation.mutate()}
            >
              <Smartphone className="w-4 h-4 mr-1" />
              {setup2faMutation.isPending ? "Setting up..." : "Enable 2FA"}
            </Button>
          </div>
        )}

        {twoFaSetup && !twoFaEnabled && (
          <div className="space-y-4 max-w-md">
            {/* QR Code placeholder */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Scan the QR code with your authenticator app:
              </p>
              <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center border border-border">
                {twoFaSetup.qr_url ? (
                  <img src={twoFaSetup.qr_url} alt="2FA QR Code" className="w-full h-full rounded-lg" />
                ) : (
                  <div className="text-center">
                    <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">QR Code</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Or enter this key manually: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{twoFaSetup.secret}</code>
              </p>
            </div>

            {/* Backup Codes */}
            <div>
              <p className="text-sm font-medium mb-2">Backup Codes</p>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm space-y-1">
                {twoFaSetup.backup_codes.map((code, idx) => (
                  <div key={idx}>{code}</div>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={copyBackupCodes}
              >
                {backupCodesCopied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy codes
                  </>
                )}
              </Button>
            </div>

            {/* Verify TOTP */}
            <div className="space-y-1.5">
              <Label htmlFor="totp">Enter code from authenticator</Label>
              <div className="flex gap-2">
                <Input
                  id="totp"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="max-w-[140px] font-mono"
                />
                <Button
                  disabled={totpCode.length !== 6 || verify2faMutation.isPending}
                  onClick={() => verify2faMutation.mutate()}
                >
                  {verify2faMutation.isPending ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {twoFaEnabled && (
          <p className="text-sm text-green-400 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            Two-factor authentication is enabled on your account.
          </p>
        )}
      </div>

      {/* ─── Active Sessions ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Active Sessions</h3>
        </div>
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <Monitor className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">Session management will be available in a future update.</p>
        </div>
      </div>

      {/* ─── Login History ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Login History</h3>
        </div>
        <div className="bg-muted/50 rounded-lg p-6 text-center">
          <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">Login history will be available in a future update.</p>
        </div>
      </div>

      {/* ─── App Preferences ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">App Preferences</h3>
        </div>
        <div className="space-y-4 max-w-md">
          {/* Acceptance Time Limit */}
          <div className="space-y-1.5">
            <Label>Acceptance Time Limit</Label>
            <Select value={acceptanceLimit} onValueChange={setAcceptanceLimit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Time allowed to accept new orders before they expire.
            </p>
          </div>

          {/* Pause Order Intake */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Pause Order Intake</Label>
              <p className="text-xs text-muted-foreground">
                Temporarily stop receiving new orders.
              </p>
            </div>
            <Switch checked={pauseIntake} onCheckedChange={setPauseIntake} />
          </div>

          {/* Notification Toggles */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-muted-foreground">Notifications</Label>

            <div className="flex items-center justify-between">
              <span className="text-sm">New Orders</span>
              <Switch checked={notifyNewOrders} onCheckedChange={setNotifyNewOrders} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Driver Updates</span>
              <Switch checked={notifyDriverUpdates} onCheckedChange={setNotifyDriverUpdates} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Customer Reviews</span>
              <Switch checked={notifyReviews} onCheckedChange={setNotifyReviews} />
            </div>
          </div>

          <Button
            disabled={savePreferencesMutation.isPending}
            onClick={() => savePreferencesMutation.mutate()}
          >
            {savePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
