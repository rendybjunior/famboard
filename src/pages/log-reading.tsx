import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useSubmitReading } from "@/hooks/use-reading-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_READING_MINUTES, QUICK_SELECT_MINUTES } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LogReadingPage() {
  const { membership } = useAuth();
  const navigate = useNavigate();
  const submitReading = useSubmitReading();
  const [minutes, setMinutes] = useState<number | "">("");
  const [bookTitle, setBookTitle] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!membership || !minutes) return;

    try {
      await submitReading.mutateAsync({
        family_id: membership.family_id,
        kid_id: membership.id,
        minutes: Number(minutes),
        book_title: bookTitle || undefined,
        notes: notes || undefined,
      });
      toast.success("Reading logged! \u{1F31F}");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to log reading.");
    }
  };

  const minuteValue = typeof minutes === "number" ? minutes : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-2xl hover:scale-110 transition-transform"
        >
          &#x2B05;&#xFE0F;
        </button>
        <h1 className="text-2xl font-extrabold">&#x1F4D6; Log Reading</h1>
      </div>

      <Card className="border-0 shadow-md rounded-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="minutes" className="font-bold text-base">
                How long did you read?
              </Label>
              <Input
                id="minutes"
                type="number"
                min={1}
                max={MAX_READING_MINUTES}
                value={minutes}
                onChange={(e) =>
                  setMinutes(e.target.value ? Number(e.target.value) : "")
                }
                placeholder="30"
                required
                className="rounded-xl h-12 text-lg text-center font-bold"
              />
              <div className="flex gap-2 justify-center">
                {QUICK_SELECT_MINUTES.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    className={`rounded-full px-4 font-bold border-0 shadow-sm ${
                      minuteValue === m
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                        : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                    }`}
                    size="sm"
                    onClick={() => setMinutes(m)}
                  >
                    {m} min
                  </Button>
                ))}
              </div>
              {minuteValue > MAX_READING_MINUTES && (
                <p className="text-sm text-destructive font-medium text-center">
                  Maximum {MAX_READING_MINUTES} minutes per entry
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookTitle" className="font-bold">
                &#x1F4DA; Book Title (optional)
              </Label>
              <Input
                id="bookTitle"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Harry Potter"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="font-bold">
                &#x1F4DD; Notes (optional)
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Chapters 5-7"
                className="rounded-xl h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
              disabled={
                submitReading.isPending ||
                !minutes ||
                minuteValue < 1 ||
                minuteValue > MAX_READING_MINUTES
              }
            >
              {submitReading.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              &#x2728; Submit Reading
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
