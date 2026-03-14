import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useSubmitReading } from "@/hooks/use-reading-entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_READING_MINUTES, QUICK_SELECT_MINUTES } from "@/lib/constants";
import { Loader2, ArrowLeft } from "lucide-react";
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
      toast.success("Reading logged!");
      navigate("/dashboard");
    } catch {
      toast.error("Failed to log reading.");
    }
  };

  const minuteValue = typeof minutes === "number" ? minutes : 0;

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
        <h1 className="text-2xl font-bold">Log Reading</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes Read</Label>
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
              />
              <div className="flex gap-2 flex-wrap">
                {QUICK_SELECT_MINUTES.map((m) => (
                  <Button
                    key={m}
                    type="button"
                    variant={minuteValue === m ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMinutes(m)}
                  >
                    {m} min
                  </Button>
                ))}
              </div>
              {minuteValue > MAX_READING_MINUTES && (
                <p className="text-sm text-destructive">
                  Maximum {MAX_READING_MINUTES} minutes per entry.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookTitle">Book Title (optional)</Label>
              <Input
                id="bookTitle"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Harry Potter"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Chapters 5-7"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
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
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
