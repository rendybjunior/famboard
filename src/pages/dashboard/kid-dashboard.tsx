import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { useKidBalance } from "@/hooks/use-balances";
import { useUpdateAvatar } from "@/hooks/use-family";
import { useReadingEntries, useCancelReading, useEditReading } from "@/hooks/use-reading-entries";
import { useRedemptions, useCancelRedemption, useEditRedemption } from "@/hooks/use-redemptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAX_READING_MINUTES, QUICK_SELECT_MINUTES } from "@/lib/constants";
import { EntryStatusBadge } from "@/components/entry-status-badge";
import { MemberAvatar } from "@/components/member-avatar";
import { AvatarPicker } from "@/components/avatar-picker";
import { X, Pencil, Timer } from "lucide-react";
import { toast } from "sonner";
import { hasActiveTimer } from "@/hooks/use-timer";

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
  const editReading = useEditReading();
  const editRedemption = useEditRedemption();

  const [editDialog, setEditDialog] = useState<{
    id: string;
    type: "reading" | "redemption";
    minutes: number;
    book_title: string;
    notes: string;
  } | null>(null);

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

  const handleEdit = async () => {
    if (!editDialog) return;
    try {
      if (editDialog.type === "reading") {
        await editReading.mutateAsync({
          entryId: editDialog.id,
          minutes: editDialog.minutes,
          book_title: editDialog.book_title,
          notes: editDialog.notes,
        });
      } else {
        await editRedemption.mutateAsync({
          entryId: editDialog.id,
          minutes: editDialog.minutes,
        });
      }
      toast.success("Entry updated!");
      setEditDialog(null);
    } catch {
      toast.error("Failed to update entry.");
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
          {!membership?.avatar && <p className="text-xs text-muted-foreground">Tap avatar to change</p>}
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

      {/* Active Timer Banner */}
      {hasActiveTimer() && (
        <Link to="/log-reading" className="block">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md rounded-xl py-3 px-4 flex items-center gap-3 hover:shadow-lg transition-shadow">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400" />
            </span>
            <Timer className="h-5 w-5 shrink-0" />
            <span className="font-bold text-sm">Reading timer is running — tap to continue</span>
          </div>
        </Link>
      )}

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
                    <>
                      <button
                        onClick={() =>
                          setEditDialog({
                            id: item.id,
                            type: item.type,
                            minutes: item.minutes,
                            book_title: "book_title" in item ? (item.book_title ?? "") : "",
                            notes: "notes" in item ? (item.notes ?? "") : "",
                          })
                        }
                        className="p-1 text-muted-foreground hover:text-purple-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCancel(item.id, item.type)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit pending entry */}
      <Dialog
        open={!!editDialog}
        onOpenChange={(open: boolean) => !open && setEditDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editDialog?.type === "reading" ? "Reading" : "Screen Time"} Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Minutes</Label>
              {editDialog?.type === "reading" && (
                <div className="flex gap-2 mb-2">
                  {QUICK_SELECT_MINUTES.map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      className={`rounded-full px-3 border-0 shadow-sm ${
                        editDialog.minutes === m
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      }`}
                      onClick={() =>
                        setEditDialog({ ...editDialog, minutes: m })
                      }
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              )}
              <Input
                type="number"
                min={1}
                max={editDialog?.type === "reading" ? MAX_READING_MINUTES : undefined}
                value={editDialog?.minutes ?? 0}
                onChange={(e) =>
                  editDialog &&
                  setEditDialog({
                    ...editDialog,
                    minutes: Number(e.target.value),
                  })
                }
              />
            </div>
            {editDialog?.type === "reading" && (
              <>
                <div className="space-y-2">
                  <Label>Book Title</Label>
                  <Input
                    value={editDialog.book_title}
                    onChange={(e) =>
                      setEditDialog({
                        ...editDialog,
                        book_title: e.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={editDialog.notes}
                    onChange={(e) =>
                      setEditDialog({
                        ...editDialog,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditDialog(null)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              onClick={handleEdit}
              disabled={editReading.isPending || editRedemption.isPending || !editDialog?.minutes || editDialog.minutes < 1}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
