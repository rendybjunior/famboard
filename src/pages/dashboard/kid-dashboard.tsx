import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useKidBalance } from "@/hooks/use-balances";
import { useUpdateAvatar } from "@/hooks/use-family";
import { useReadingEntries } from "@/hooks/use-reading-entries";
import { useRedemptions } from "@/hooks/use-redemptions";
import { useCancelReading } from "@/hooks/use-reading-entries";
import { useCancelRedemption } from "@/hooks/use-redemptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntryStatusBadge } from "@/components/entry-status-badge";
import { MemberAvatar } from "@/components/member-avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function KidDashboard() {
  const { membership, refreshMembership } = useAuth();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const updateAvatar = useUpdateAvatar();
  const { data: balance } = useKidBalance(membership?.id);
  const { data: readings } = useReadingEntries({
    familyId: membership?.family_id ?? "",
    kidId: membership?.id,
    limit: 10,
  });
  const { data: redemptions } = useRedemptions({
    familyId: membership?.family_id ?? "",
    kidId: membership?.id,
    limit: 10,
  });
  const cancelReading = useCancelReading();
  const cancelRedemption = useCancelRedemption();

  const activity = [
    ...(readings ?? []).map((r) => ({ ...r, type: "reading" as const })),
    ...(redemptions ?? []).map((r) => ({ ...r, type: "redemption" as const })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10);

  const handleCancel = async (
    id: string,
    type: "reading" | "redemption"
  ) => {
    try {
      if (type === "reading") {
        await cancelReading.mutateAsync(id);
      } else {
        await cancelRedemption.mutateAsync(id);
      }
      toast.success("Entry cancelled.");
    } catch {
      toast.error("Failed to cancel entry.");
    }
  };

  const balanceValue = balance?.balance ?? 0;

  const handleAvatarChange = async (emoji: string) => {
    try {
      await updateAvatar.mutateAsync(emoji);
      await refreshMembership();
      setAvatarOpen(false);
      toast.success("Avatar updated!");
    } catch {
      toast.error("Failed to update avatar.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setAvatarOpen(true)} className="hover:scale-110 transition-transform">
          <MemberAvatar
            avatar={membership?.avatar ?? null}
            displayName={membership?.display_name ?? ""}
            size="lg"
          />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold">
            Hi, {membership?.display_name}! <span className="inline-block animate-bounce">&#x1F44B;</span>
          </h1>
          <p className="text-xs text-muted-foreground">Tap avatar to change</p>
        </div>
      </div>

      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Your Avatar</DialogTitle>
          </DialogHeader>
          <AvatarPicker
            value={membership?.avatar ?? null}
            onChange={handleAvatarChange}
          />
        </DialogContent>
      </Dialog>

      {/* Balance Card */}
      <Card className="border-0 bg-gradient-to-br from-purple-500 via-pink-500 to-amber-400 text-white shadow-lg">
        <CardContent className="pt-6 pb-6 text-center">
          <p className="text-sm opacity-90">
            &#x2728; Screen Time Balance &#x2728;
          </p>
          <p className="text-6xl font-extrabold mt-2 drop-shadow-sm">
            {balanceValue}
          </p>
          <p className="text-sm opacity-90 mt-1">minutes available</p>
          {balanceValue === 0 && (
            <p className="text-sm mt-3 opacity-80">
              &#x1F4DA; Read a book to earn screen time!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/log-reading">
          <Button
            size="lg"
            className="h-16 w-full text-base font-bold bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-md border-0 rounded-xl"
          >
            <span className="mr-2 text-xl">&#x1F4D6;</span>
            Log Reading
          </Button>
        </Link>
        <Link
          to="/redeem-screen-time"
          className={
            balanceValue <= 0
              ? "pointer-events-none opacity-50"
              : ""
          }
        >
          <Button
            size="lg"
            className="h-16 w-full text-base font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md border-0 rounded-xl"
            disabled={balanceValue <= 0}
          >
            <span className="mr-2 text-xl">&#x1F3AE;</span>
            Screen Time
          </Button>
        </Link>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold mb-3">
          &#x1F4CB; Recent Activity
        </h2>
        {activity.length === 0 ? (
          <Card className="border-dashed border-2 border-purple-200 bg-purple-50/50">
            <CardContent className="py-8 text-center">
              <p className="text-4xl mb-2">&#x1F31F;</p>
              <p className="text-sm text-muted-foreground font-medium">
                No activity yet. Start by logging some reading!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <Card
                key={`${item.type}-${item.id}`}
                className="shadow-sm hover:shadow-md transition-shadow rounded-xl"
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <span className="text-xl shrink-0">
                    {item.type === "reading" ? "\u{1F4D6}" : "\u{1F3AE}"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {item.minutes} min{" "}
                      {item.type === "reading" ? "reading" : "screen time"}
                    </p>
                    {"book_title" in item && item.book_title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.book_title}
                      </p>
                    )}
                    {item.status === "rejected" && item.review_note && (
                      <p className="text-xs text-destructive mt-0.5">
                        {item.review_note}
                      </p>
                    )}
                  </div>
                  <EntryStatusBadge status={item.status} />
                  {item.status === "pending" && (
                    <button
                      onClick={() => handleCancel(item.id, item.type)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
