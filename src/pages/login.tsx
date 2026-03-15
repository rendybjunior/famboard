import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/gtag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_NAME } from "@/lib/constants";
import { Loader2 } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { session, membership, isLoading, signIn, refreshMembership } =
    useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;
  if (session && membership) return <Navigate to="/dashboard" replace />;

  // User is signed in (e.g. via Google) but has no family yet
  const needsFamily = !!session && !membership;

  const handleGoogleSignIn = async () => {
    trackEvent("login", { method: "google" });
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
  };

  const handleCreateFamily = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { error: rpcErr } = await supabase.rpc("create_family", {
        family_name: familyName,
        creator_display_name: displayName,
      });
      if (rpcErr) throw rpcErr;

      trackEvent("family_created", { method: "google" });
      await refreshMembership(session!.user.id);
      navigate("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Something went wrong";
      setError(message);
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        trackEvent("login", { method: "email" });
        navigate("/dashboard");
      } else {
        // Sign up with temp client to avoid session race conditions
        const tempClient = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
        const { data, error: signUpErr } = await tempClient.auth.signUp({
          email,
          password,
        });
        if (signUpErr) throw signUpErr;
        if (!data.user) throw new Error("Failed to create account");

        const { error: rpcErr } = await supabase.rpc("create_family", {
          family_name: familyName,
          creator_display_name: displayName,
          for_user_id: data.user.id,
        });
        if (rpcErr) throw rpcErr;

        await signIn(email, password);
        trackEvent("sign_up", { method: "email" });
        trackEvent("family_created", { method: "email" });
        await refreshMembership(data.user.id);
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Something went wrong";
      setError(message);
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-muted-foreground">Setting up your family...</p>
      </div>
    );
  }

  // After Google sign-in, user needs to create a family
  if (needsFamily) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm shadow-xl border-0 rounded-2xl">
          <CardHeader className="text-center pb-2">
            <div className="text-5xl mb-2">&#x1F46A;</div>
            <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Create Your Family
            </CardTitle>
            <CardDescription className="text-base">
              One last step to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateFamily} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="familyName" className="font-semibold">
                  Family Name
                </Label>
                <Input
                  id="familyName"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="The Smiths"
                  required
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-semibold">
                  Your Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Mom"
                  required
                  className="rounded-xl h-11"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
              >
                Create Family
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-xl border-0 rounded-2xl">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-2">&#x1F3E0;</div>
          <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            {APP_NAME}
          </CardTitle>
          <CardDescription className="text-base">
            Family Activity Tracker
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-semibold rounded-xl"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="familyName" className="font-semibold">
                    Family Name
                  </Label>
                  <Input
                    id="familyName"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="The Smiths"
                    required
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="font-semibold">
                    Your Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Mom"
                    required
                    className="rounded-xl h-11"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                className="rounded-xl h-11"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
              disabled={submitting}
            >
              {mode === "signin" ? "Sign In" : "Create Family & Sign Up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                First time?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                  className="text-pink-500 font-semibold underline underline-offset-4 hover:text-pink-600"
                >
                  Set up your family
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                  className="text-pink-500 font-semibold underline underline-offset-4 hover:text-pink-600"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
