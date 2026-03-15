import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useSubmitReading } from "@/hooks/use-reading-entries";
import { useTimer } from "@/hooks/use-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_READING_MINUTES, QUICK_SELECT_MINUTES } from "@/lib/constants";
import { Loader2, Play, Pause, Square, Timer, PenLine } from "lucide-react";
import { toast } from "sonner";

type Mode = "manual" | "timer";

export default function LogReadingPage() {
  const { membership } = useAuth();
  const navigate = useNavigate();
  const submitReading = useSubmitReading();
  const timer = useTimer();

  // If timer is already active, start in timer mode
  const [mode, setMode] = useState<Mode>(timer.isActive ? "timer" : "manual");
  const [minutes, setMinutes] = useState<number | "">("");
  const [bookTitle, setBookTitle] = useState("");
  const [notes, setNotes] = useState("");
  // After stopping timer, show the form to fill details before submitting
  const [timerStopped, setTimerStopped] = useState(false);

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

  const handleTimerStop = () => {
    const elapsed = timer.stop();
    setMinutes(elapsed);
    setTimerStopped(true);
  };

  const handleTimerDiscard = () => {
    timer.reset();
    setTimerStopped(false);
    setMinutes("");
  };

  const minuteValue = typeof minutes === "number" ? minutes : 0;
  const pad = (n: number) => String(n).padStart(2, "0");

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

      {/* Mode Toggle */}
      {!timerStopped && (
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          <button
            onClick={() => !timer.isActive && setMode("manual")}
            disabled={timer.isActive}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              mode === "manual"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-muted-foreground"
            } ${timer.isActive ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <PenLine className="h-4 w-4" />
            Manual
          </button>
          <button
            onClick={() => setMode("timer")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
              mode === "timer"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Timer className="h-4 w-4" />
            Timer
          </button>
        </div>
      )}

      {mode === "timer" && !timerStopped ? (
        /* Timer Mode */
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-6">
              {/* Timer Display */}
              <div className="relative">
                <div
                  className={`w-48 h-48 rounded-full flex items-center justify-center border-4 ${
                    timer.status === "running"
                      ? "border-purple-500 shadow-lg shadow-purple-200"
                      : timer.status === "paused"
                        ? "border-amber-400 shadow-lg shadow-amber-100"
                        : "border-muted"
                  } transition-all`}
                >
                  <span className="text-5xl font-mono font-extrabold tabular-nums tracking-tight">
                    {pad(timer.displayMinutes)}:{pad(timer.displaySeconds)}
                  </span>
                </div>
                {timer.status === "running" && (
                  <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                )}
                {timer.status === "paused" && (
                  <span className="absolute top-2 right-2 h-3 w-3 rounded-full bg-amber-400" />
                )}
              </div>

              <p className="text-sm text-muted-foreground font-medium">
                {timer.status === "idle" && "Press start when you begin reading"}
                {timer.status === "running" && "Reading in progress..."}
                {timer.status === "paused" && "Timer paused"}
              </p>

              {/* Controls */}
              <div className="flex gap-3">
                {timer.status === "idle" && (
                  <Button
                    onClick={timer.start}
                    className="h-14 px-8 text-base font-bold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Reading
                  </Button>
                )}
                {timer.status === "running" && (
                  <>
                    <Button
                      onClick={timer.pause}
                      className="h-14 px-6 text-base font-bold rounded-full bg-amber-500 hover:bg-amber-600 border-0 shadow-md"
                    >
                      <Pause className="mr-2 h-5 w-5" />
                      Pause
                    </Button>
                    <Button
                      onClick={handleTimerStop}
                      className="h-14 px-6 text-base font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-md"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Done
                    </Button>
                  </>
                )}
                {timer.status === "paused" && (
                  <>
                    <Button
                      onClick={timer.resume}
                      className="h-14 px-6 text-base font-bold rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-md"
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Resume
                    </Button>
                    <Button
                      onClick={handleTimerStop}
                      className="h-14 px-6 text-base font-bold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-md"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      Done
                    </Button>
                  </>
                )}
              </div>

              {timer.isActive && (
                <button
                  onClick={handleTimerDiscard}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  Discard timer
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Manual Mode / Post-Timer Form */
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="minutes" className="font-bold text-base">
                  {timerStopped
                    ? "You read for"
                    : "How long did you read?"}
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
                {!timerStopped && (
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
                )}
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

              {timerStopped && (
                <button
                  type="button"
                  onClick={() => {
                    setTimerStopped(false);
                    setMinutes("");
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-purple-600 transition-colors"
                >
                  Back to timer
                </button>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
