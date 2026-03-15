import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useReadingEntries, useReviewReading } from "@/hooks/use-reading-entries";
import { useRedemptions, useReviewRedemption } from "@/hooks/use-redemptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/member-avatar";

type FilterType = "all" | "reading" | "redemption";

const filterConfig: { value: FilterType; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "\u{1F4CB}" },
  { value: "reading", label: "Reading", emoji: "\u{1F4D6}" },
  { value: "redemption", label: "Screen Time", emoji: "\u{1F3AE}" },
];

export default function ApprovalsPage() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const [filter, setFilter] = useState<FilterType>("all");
  const [rejectDialog, setRejectDialog] = useState<{
    id: string;
    type: "reading" | "redemption";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bulkApproving, setBulkApproving] = useState(false);

  const { data: readings } = useReadingEntries({
    familyId,
    status: "pending",
  });
  const { data: redemptions } = useRedemptions({
    familyId,
    status: "pending",
  });
  const reviewReading = useReviewReading();
  const reviewRedemption = useReviewRedemption();

  const items = [
    ...(filter !== "redemption"
      ? (readings ?? []).map((r) => ({ ...r, type: "reading" as const }))
      : []),
    ...(filter !== "reading"
      ? (redemptions ?? []).map((r) => ({ ...r, type: "redemption" as const }))
      : []),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const handleApprove = async (
    id: string,
    type: "reading" | "redemption"
  ) => {
    if (!membership) return;
    try {
      if (type === "reading") {
        await reviewReading.mutateAsync({
          entryId: id,
          status: "approved",
          reviewedBy: membership.id,
        });
      } else {
        await reviewRedemption.mutateAsync({
          entryId: id,
          status: "approved",
          reviewedBy: membership.id,
        });
      }
      toast.success("Approved! \u{2705}");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve."
      );
    }
  };

  const handleBulkApprove = async () => {
    if (!membership || items.length === 0) return;
    setBulkApproving(true);
    let approved = 0;
    let failed = 0;
    for (const item of items) {
      try {
        if (item.type === "reading") {
          await reviewReading.mutateAsync({
            entryId: item.id,
            status: "approved",
            reviewedBy: membership.id,
          });
        } else {
          await reviewRedemption.mutateAsync({
            entryId: item.id,
            status: "approved",
            reviewedBy: membership.id,
          });
        }
        approved++;
      } catch {
        failed++;
      }
    }
    setBulkApproving(false);
    if (failed === 0) {
      toast.success(`Approved all ${approved} items!`);
    } else {
      toast.warning(`Approved ${approved}, failed ${failed}.`);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !membership) return;
    try {
      if (rejectDialog.type === "reading") {
        await reviewReading.mutateAsync({
          entryId: rejectDialog.id,
          status: "rejected",
          reviewedBy: membership.id,
          reviewNote: rejectReason || undefined,
        });
      } else {
        await reviewRedemption.mutateAsync({
          entryId: rejectDialog.id,
          status: "rejected",
          reviewedBy: membership.id,
          reviewNote: rejectReason || undefined,
        });
      }
      toast.success("Rejected.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject."
      );
    } finally {
      setRejectDialog(null);
      setRejectReason("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">&#x2705; Approvals</h1>
        {items.length > 0 && (
          <Button
            size="sm"
            className="rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm"
            onClick={handleBulkApprove}
            disabled={bulkApproving}
          >
            {bulkApproving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-1 h-4 w-4" />
            )}
            Approve All ({items.length})
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {filterConfig.map((f) => (
          <Button
            key={f.value}
            className={`rounded-full px-4 font-bold border-0 shadow-sm ${
              filter === f.value
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.emoji} {f.label}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">&#x1F389;</p>
          <p className="text-lg font-bold text-emerald-600">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={`${item.type}-${item.id}`}
              className="border-0 shadow-sm rounded-2xl overflow-hidden"
            >
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MemberAvatar
                    avatar={item.kid?.avatar ?? null}
                    displayName={item.kid?.display_name ?? ""}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">
                      {item.kid?.display_name}
                    </p>
                    <p className="text-sm font-semibold text-purple-600">
                      {item.minutes} min {item.type === "reading" ? "reading" : "screen time"}
                    </p>
                    {"book_title" in item && item.book_title && (
                      <p className="text-sm text-muted-foreground">
                        {item.book_title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-sm h-10"
                    onClick={() => handleApprove(item.id, item.type)}
                    disabled={
                      reviewReading.isPending || reviewRedemption.isPending
                    }
                  >
                    {(reviewReading.isPending || reviewRedemption.isPending) && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    &#x2705; Approve
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl font-bold bg-red-100 text-red-600 hover:bg-red-200 border-0 shadow-sm h-10"
                    onClick={() =>
                      setRejectDialog({ id: item.id, type: item.type })
                    }
                  >
                    &#x274C; Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setRejectDialog(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Entry</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="rounded-xl"
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setRejectDialog(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white border-0"
              onClick={handleReject}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
