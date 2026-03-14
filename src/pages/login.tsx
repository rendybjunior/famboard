import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
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
import { APP_NAME } from "@/lib/constants";
import { Loader2 } from "lucide-react";

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
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

        // Create family with explicit user ID (no session needed)
        const { error: rpcErr } = await supabase.rpc("create_family", {
          family_name: familyName,
          creator_display_name: displayName,
          for_user_id: data.user.id,
        });
        if (rpcErr) throw rpcErr;

        // Now sign in to establish session
        await signIn(email, password);
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
        <p className="text-muted-foreground">
          {mode === "signup" ? "Setting up your family..." : "Signing in..."}
        </p>
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
            Family Activity Tracker &#x2728;
          </CardDescription>
        </CardHeader>
        <CardContent>
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
