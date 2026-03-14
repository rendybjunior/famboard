import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { usePendingCount } from "@/hooks/use-family";
import { useFamilyBalances } from "@/hooks/use-balances";
import { useReadingEntries } from "@/hooks/use-reading-entries";
import { useRedemptions } from "@/hooks/use-redemptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EntryStatusBadge } from "@/components/entry-status-badge";
import { BookOpen, Monitor, CheckCircle } from "lucide-react";

export default function ParentDashboard() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const { data: pendingCount } = usePendingCount(familyId);
  const { data: balances } = useFamilyBalances(familyId);
  const { data: readings } = useReadingEntries({
    familyId,
    limit: 15,
  });
  const { data: redemptions } = useRedemptions({
    familyId,
    limit: 15,
  });

  const activity = [
    ...(readings ?? []).map((r) => ({ ...r, type: "reading" as const })),
    ...(redemptions ?? []).map((r) => ({ ...r, type: "redemption" as const })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 15);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Hi, {membership?.display_name}!
      </h1>

      <Card>
        <CardContent className="py-4">
          {pendingCount && pendingCount > 0 ? (
            <Link to="/approvals" className="block">
              <Button variant="default" className="w-full">
                {pendingCount} item{pendingCount !== 1 ? "s" : ""} to review
              </Button>
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
              <CheckCircle className="h-5 w-5" />
              <span>All caught up!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {balances && balances.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Family Overview</h2>
          <div className="grid gap-2">
            {balances.map((kid) => (
              <Card key={kid.kid_id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{kid.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {kid.redemption_rate}:1 rate
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{kid.balance}</p>
                    <p className="text-xs text-muted-foreground">min</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No family activity yet.
          </p>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <Card key={`${item.type}-${item.id}`}>
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  {item.type === "reading" ? (
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground">
                        {item.kid?.display_name}
                      </span>{" "}
                      — {item.minutes} min{" "}
                      {item.type === "reading" ? "reading" : "screen time"}
                    </p>
                    {"book_title" in item && item.book_title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.book_title}
                      </p>
                    )}
                  </div>
                  <EntryStatusBadge status={item.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
