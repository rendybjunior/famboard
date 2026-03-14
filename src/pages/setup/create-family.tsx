import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
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
import { Loader2 } from "lucide-react";

export default function CreateFamilyPage() {
  const { session, signIn, refreshMembership } = useAuth();
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsSignUp = !session;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      let userId = session?.user.id;

      if (needsSignUp) {
        // Sign up with a temp client so the main client session isn't affected mid-flow
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
        userId = data.user.id;
      }

      // Pass for_user_id so it works even before session is established
      const { error: rpcErr } = await supabase.rpc("create_family", {
        family_name: familyName,
        creator_display_name: displayName,
        for_user_id: userId,
      });
      if (rpcErr) throw rpcErr;

      // Now sign in to establish the session
      if (needsSignUp) {
        await signIn(email, password);
      }
      await refreshMembership(userId);
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

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-muted-foreground">Setting up your family...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-xl border-0 rounded-2xl">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-2">&#x1F46A;</div>
          <CardTitle className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            Create Your Family
          </CardTitle>
          <CardDescription className="text-base">
            Set up your family group to start tracking activities &#x2728;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="familyName" className="font-semibold">&#x1F3E0; Family Name</Label>
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
              <Label htmlFor="displayName" className="font-semibold">&#x1F9D1; Your Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Mom"
                required
                className="rounded-xl h-11"
              />
            </div>
            {needsSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold">Email</Label>
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
                  <Label htmlFor="password" className="font-semibold">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="rounded-xl h-11"
                  />
                </div>
              </>
            )}
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              &#x2728; Create Family
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
