import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { usePendingCount } from "@/hooks/use-family";
import { useFamilyBalances } from "@/hooks/use-balances";
import { useReadingEntries } from "@/hooks/use-reading-entries";
import { useRedemptions } from "@/hooks/use-redemptions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EntryStatusBadge } from "@/components/entry-status-badge";

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
      <h1 className="text-2xl font-extrabold">
        Hi, {membership?.display_name}! &#x1F44B;
      </h1>

      {/* Pending approvals */}
      <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
        <CardContent className="py-4">
          {pendingCount && pendingCount > 0 ? (
            <Link to="/approvals" className="block">
              <Button className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0 shadow-md">
                &#x1F514; {pendingCount} item{pendingCount !== 1 ? "s" : ""} to review
              </Button>
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-2xl">&#x2705;</span>
              <span className="font-semibold text-emerald-600">All caught up!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family overview */}
      {balances && balances.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">&#x1F46A; Family Overview</h2>
          <div className="grid gap-3">
            {balances.map((kid) => (
              <Card key={kid.kid_id} className="border-0 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="py-4 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-base">{kid.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {kid.redemption_rate}:1 rate
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                      {kid.balance}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">min available</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-bold mb-3">&#x1F4CB; Recent Activity</h2>
        {activity.length === 0 ? (
          <Card className="border-dashed border-2 border-purple-200 bg-purple-50/50 rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-4xl mb-2">&#x1F31F;</p>
              <p className="text-sm text-muted-foreground font-medium">
                No family activity yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activity.map((item) => (
              <Card
                key={`${item.type}-${item.id}`}
                className="shadow-sm hover:shadow-md transition-shadow rounded-xl border-0"
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <span className="text-xl shrink-0">
                    {item.type === "reading" ? "\u{1F4D6}" : "\u{1F3AE}"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      <span className="text-purple-500">
                        {item.kid?.display_name}
                      </span>{" "}
                      &mdash; {item.minutes} min{" "}
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
