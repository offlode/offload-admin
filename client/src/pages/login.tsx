import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiRequest, setAuthToken } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email: username, password });
      const data = await res.json();
      const user = data.user || data;
      if (!user || !["admin", "manager"].includes(user.role)) {
        setAuthToken(null);
        setError("Access denied. Admin or manager role required.");
        return;
      }
      setAuthToken(data.token || null);
      login(user);
    } catch (err: any) {
      setError(err?.message?.includes("403") ? "Access denied. Admin or manager role required." : "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your email or username.");
      return;
    }

    setForgotLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { identifier: forgotIdentifier });
      setForgotSuccess(true);
    } catch {
      setForgotError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
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

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-3 pb-2">
            {logo}
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Reset Password</h1>
              <p className="text-sm text-muted-foreground">
                {forgotSuccess
                  ? "Check your email for a reset link."
                  : "Enter your email or username to receive a reset link."}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  If an account with that email/username exists, a password reset link has been sent.
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSuccess(false);
                    setForgotIdentifier("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {forgotError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-identifier">Email or Username</Label>
                  <Input
                    id="forgot-identifier"
                    value={forgotIdentifier}
                    onChange={(e) => { setForgotIdentifier(e.target.value); setForgotError(""); }}
                    placeholder="you@example.com"
                    autoComplete="username"
                    className={forgotError ? "border-red-500/50" : ""}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={forgotLoading}>
                  {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotError("");
                    setForgotIdentifier("");
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </form>
            )}
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
            <h1 className="text-xl font-semibold tracking-tight">Offload Admin</h1>
            <p className="text-sm text-muted-foreground">Sign in to your admin dashboard</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" data-testid="login-error">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="username">Email or Username</Label>
              <Input
                id="username"
                data-testid="input-username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="you@email.com"

                autoComplete="username"
                className={error ? "border-red-500/50" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-[#5B4BC4] hover:underline"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={error ? "border-red-500/50" : ""}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>



          </form>
        </CardContent>
      </Card>
    </div>
  );
}
