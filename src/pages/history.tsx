import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFamilyMembers } from "@/hooks/use-family";
import { useReadingEntries } from "@/hooks/use-reading-entries";
import { useRedemptions } from "@/hooks/use-redemptions";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntryStatusBadge } from "@/components/entry-status-badge";
import { BookOpen, Monitor } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import type { EntryStatus } from "@/types/database";

type TypeFilter = "all" | "reading" | "redemption";

export default function HistoryPage() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const isParent = membership?.role === "parent";

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kidFilter, setKidFilter] = useState<string>("all");

  const { data: members } = useFamilyMembers(isParent ? familyId : undefined);
  const kids = members?.filter((m) => m.role === "kid") ?? [];

  const readingFilters = {
    familyId,
    kidId:
      isParent && kidFilter !== "all"
        ? kidFilter
        : !isParent
          ? membership?.id
          : undefined,
    status:
      statusFilter !== "all" ? (statusFilter as EntryStatus) : undefined,
    limit: 50,
  };

  const { data: readings } = useReadingEntries(readingFilters);
  const { data: redemptions } = useRedemptions({
    ...readingFilters,
  });

  const items = [
    ...(typeFilter !== "redemption"
      ? (readings ?? []).map((r) => ({ ...r, type: "reading" as const }))
      : []),
    ...(typeFilter !== "reading"
      ? (redemptions ?? []).map((r) => ({ ...r, type: "redemption" as const }))
      : []),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">History</h1>

      <div className="flex gap-2 flex-wrap">
        <Select
          value={typeFilter}
          onValueChange={(v) => v && setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="redemption">Screen Time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {isParent && kids.length > 0 && (
          <Select value={kidFilter} onValueChange={(v) => v && setKidFilter(v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Kids</SelectItem>
              {kids.map((kid) => (
                <SelectItem key={kid.id} value={kid.id}>
                  {kid.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No entries match your filters.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="py-3 px-4 flex items-center gap-3">
                {isParent && item.kid ? (
                  <MemberAvatar
                    avatar={item.kid.avatar ?? null}
                    displayName={item.kid.display_name}
                    size="sm"
                  />
                ) : item.type === "reading" ? (
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {isParent && item.kid?.display_name && (
                      <span className="text-muted-foreground">
                        {item.kid.display_name} —{" "}
                      </span>
                    )}
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <EntryStatusBadge status={item.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
