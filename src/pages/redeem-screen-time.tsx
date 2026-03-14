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
import { Loader2 } from "lucide-react";
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
      toast.success("Screen time requested! \u{1F389}");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to request screen time.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-2xl hover:scale-110 transition-transform"
        >
          &#x2B05;&#xFE0F;
        </button>
        <h1 className="text-2xl font-extrabold">&#x1F3AE; Screen Time</h1>
      </div>

      <Card className="border-0 bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 text-white shadow-lg rounded-2xl">
        <CardContent className="pt-6 pb-6 text-center">
          <p className="text-sm opacity-90">&#x2728; Available Balance &#x2728;</p>
          <p className="text-5xl font-extrabold mt-2 drop-shadow-sm">{available}</p>
          <p className="text-sm opacity-90 mt-1">minutes</p>
        </CardContent>
      </Card>

      {hasPending ? (
        <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50 rounded-2xl">
          <CardContent className="py-6 text-center">
            <p className="text-3xl mb-2">&#x23F3;</p>
            <p className="text-sm text-amber-700 font-medium">
              You already have a pending screen time request. Wait for it to be
              reviewed before submitting another.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="minutes" className="font-bold text-base">
                  How much screen time?
                </Label>
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
                  className="rounded-xl h-12 text-lg text-center font-bold"
                />
                <div className="flex gap-2 justify-center">
                  {QUICK_SELECT_MINUTES.filter((m) => m <= available).map(
                    (m) => (
                      <Button
                        key={m}
                        type="button"
                        className={`rounded-full px-4 font-bold border-0 shadow-sm ${
                          minuteValue === m
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                            : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                        }`}
                        size="sm"
                        onClick={() => setMinutes(m)}
                      >
                        {m} min
                      </Button>
                    )
                  )}
                </div>
                {minuteValue > available && (
                  <p className="text-sm text-destructive font-medium text-center">
                    Cannot exceed your balance of {available} minutes
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0 shadow-md"
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
                &#x1F3AE; Request Screen Time
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
