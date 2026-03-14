import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useKidBalance } from "@/hooks/use-balances";
import {
  useHasPendingRedemption,
  useSubmitRedemption,
} from "@/hooks/use-redemptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { QUICK_SELECT_MINUTES } from "@/lib/constants";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function RedeemScreenTimePage() {
  const { membership } = useAuth();
  const navigate = useNavigate();
  const { data: balance } = useKidBalance(membership?.id);
  const { data: hasPending } = useHasPendingRedemption(membership?.id);
  const submitRedemption = useSubmitRedemption();
  const [minutes, setMinutes] = useState<number | "">("");

  const available = balance?.balance ?? 0;
  const minuteValue = typeof minutes === "number" ? minutes : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!membership || !minutes) return;

    try {
      await submitRedemption.mutateAsync({
        family_id: membership.family_id,
        kid_id: membership.id,
        minutes: Number(minutes),
      });
      toast.success("Screen time requested!");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to request screen time.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Use Screen Time</h1>
      </div>

      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-4xl font-bold mt-1">{available}</p>
          <p className="text-sm text-muted-foreground mt-1">minutes</p>
        </CardContent>
      </Card>

      {hasPending ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              You already have a pending screen time request. Wait for it to be
              reviewed before submitting another.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes to Redeem</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={1}
                  max={available}
                  value={minutes}
                  onChange={(e) =>
                    setMinutes(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="30"
                  required
                />
                <div className="flex gap-2 flex-wrap">
                  {QUICK_SELECT_MINUTES.filter((m) => m <= available).map(
                    (m) => (
                      <Button
                        key={m}
                        type="button"
                        variant={minuteValue === m ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMinutes(m)}
                      >
                        {m} min
                      </Button>
                    )
                  )}
                </div>
                {minuteValue > available && (
                  <p className="text-sm text-destructive">
                    Cannot exceed your balance of {available} minutes.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  submitRedemption.isPending ||
                  !minutes ||
                  minuteValue < 1 ||
                  minuteValue > available
                }
              >
                {submitRedemption.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Request Screen Time
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
