import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

function useQueryParams() {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(hash.slice(queryIndex));
}

export default function ResetPasswordPage() {
  const params = useQueryParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");
    setConfirmError("");

    let hasError = false;
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      const msg = err.message || "Something went wrong.";
      // Parse error message from "400: {json}" format
      try {
        const jsonPart = msg.substring(msg.indexOf("{"));
        const parsed = JSON.parse(jsonPart);
        setError(parsed.message || msg);
      } catch {
        setError(msg.includes(":") ? msg.split(": ").slice(1).join(": ") : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const logo = (
    <div className="flex justify-center">
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-label="Offload logo">
        <rect width="32" height="32" rx="8" fill="#5B4BC4" />
        <path d="M8 16C8 11.6 11.6 8 16 8C20.4 8 24 11.6 24 16C24 20.4 20.4 24 16 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 24L12 20M16 24L20 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-3 pb-2">
            {logo}
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Invalid Link</h1>
              <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/#/">
              <Button variant="outline" className="w-full">Back to Sign In</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-3 pb-2">
            {logo}
            <div>
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Password Reset</h1>
              <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
            </div>
          </CardHeader>
          <CardContent>
            <a href="/#/">
              <Button className="w-full">Sign In</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3 pb-2">
          {logo}
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Set New Password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); setError(""); }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={passwordError ? "border-red-500/50" : ""}
              />
              {passwordError && (
                <p className="text-xs text-red-500">{passwordError}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(""); setError(""); }}
                placeholder="••••••••"
                autoComplete="new-password"
                className={confirmError ? "border-red-500/50" : ""}
              />
              {confirmError && (
                <p className="text-xs text-red-500">{confirmError}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
