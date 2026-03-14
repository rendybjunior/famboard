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
import { BookOpen, Monitor, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type FilterType = "all" | "reading" | "redemption";

export default function ApprovalsPage() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const [filter, setFilter] = useState<FilterType>("all");
  const [rejectDialog, setRejectDialog] = useState<{
    id: string;
    type: "reading" | "redemption";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
      toast.success("Approved!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve."
      );
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

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "reading", label: "Reading" },
    { value: "redemption", label: "Screen Time" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-3">
                  {item.type === "reading" ? (
                    <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  ) : (
                    <Monitor className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {item.kid?.display_name} —{" "}
                      {item.type === "reading" ? "Reading" : "Screen Time"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.minutes} minutes
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
                    className="flex-1"
                    onClick={() => handleApprove(item.id, item.type)}
                    disabled={
                      reviewReading.isPending || reviewRedemption.isPending
                    }
                  >
                    {(reviewReading.isPending || reviewRedemption.isPending) && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      setRejectDialog({ id: item.id, type: item.type })
                    }
                  >
                    Reject
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
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
