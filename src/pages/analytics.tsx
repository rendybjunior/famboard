import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useFamilyMembers } from "@/hooks/use-family";
import { useAnalyticsData } from "@/hooks/use-analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberAvatar } from "@/components/member-avatar";
import type { DailyTotal, WeeklyTotal, KidStats } from "@/lib/analytics-utils";

type Period = "week" | "month";

function StatCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="py-4 text-center">
        <p className="text-2xl">{emoji}</p>
        <p className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
          {value}
        </p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </CardContent>
    </Card>
  );
}

function BarChart({
  data,
}: {
  data: { label: string; reading: number; redemption: number }[];
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.reading, d.redemption)), 1);

  return (
    <div className="space-y-2">
      {data.map((row) => (
        <div key={row.label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12 text-right shrink-0 font-medium">
            {row.label}
          </span>
          <div className="flex-1 space-y-1">
            <div
              className="h-3 rounded-r-lg bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-500"
              style={{ width: `${Math.max((row.reading / maxVal) * 100, row.reading > 0 ? 3 : 0)}%` }}
            />
            {row.redemption > 0 && (
              <div
                className="h-2 rounded-r-lg bg-gradient-to-r from-pink-400 to-rose-400 transition-all duration-500"
                style={{ width: `${Math.max((row.redemption / maxVal) * 100, 3)}%` }}
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground w-8 shrink-0">
            {row.reading > 0 ? row.reading : ""}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-500" />
          <span className="text-xs text-muted-foreground">Reading</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-pink-400 to-rose-400" />
          <span className="text-xs text-muted-foreground">Screen Time</span>
        </div>
      </div>
    </div>
  );
}

function KidBreakdown({ kidStats, maxReading }: { kidStats: KidStats[]; maxReading: number }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Per Kid</h2>
      {kidStats.map((kid) => (
        <Card key={kid.kidId} className="border-0 shadow-sm rounded-2xl">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3 mb-3">
              <MemberAvatar avatar={kid.avatar} displayName={kid.displayName} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold">{kid.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {kid.averagePerDay} min/day avg
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  {kid.totalReading}
                </p>
                <p className="text-xs text-muted-foreground">min read</p>
              </div>
            </div>
            {/* Progress bar relative to top reader */}
            <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${maxReading > 0 ? (kid.totalReading / maxReading) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{kid.currentStreak} day streak</span>
              <span>{kid.activeDays} active days</span>
              <span>{kid.totalRedemption} min used</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { membership } = useAuth();
  const familyId = membership?.family_id ?? "";
  const isParent = membership?.role === "parent";
  const [period, setPeriod] = useState<Period>("week");

  const { data: members } = useFamilyMembers(familyId);

  const { data: analytics, isLoading } = useAnalyticsData({
    familyId,
    kidId: isParent ? undefined : membership?.id,
    period,
    members: members ?? [],
  });

  const chartData =
    period === "week"
      ? (analytics?.dailyTotals ?? []).map((d: DailyTotal) => ({
          label: d.label,
          reading: d.readingMinutes,
          redemption: d.redemptionMinutes,
        }))
      : (analytics?.weeklyTotals ?? []).map((w: WeeklyTotal) => ({
          label: w.label,
          reading: w.readingMinutes,
          redemption: w.redemptionMinutes,
        }));

  const maxKidReading = Math.max(
    ...(analytics?.kidStats ?? []).map((k) => k.totalReading),
    0,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Stats</h1>

      {/* Period toggle */}
      <div className="flex gap-2">
        {(["week", "month"] as const).map((p) => (
          <Button
            key={p}
            className={`rounded-full px-5 font-bold border-0 shadow-sm ${
              period === p
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
            }`}
            size="sm"
            onClick={() => setPeriod(p)}
          >
            {p === "week" ? "This Week" : "This Month"}
          </Button>
        ))}
      </div>

      {isLoading || !analytics ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2 animate-pulse">{"\u{1F4CA}"}</p>
          <p className="text-sm text-muted-foreground">Loading stats...</p>
        </div>
      ) : analytics.totalReading === 0 && analytics.totalRedemption === 0 ? (
        <div className="text-center py-12">
          <p className="text-5xl mb-3">{"\u{1F4DA}"}</p>
          <p className="text-lg font-bold text-purple-600">No data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start reading to see your stats here!
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              emoji={"\u{1F4DA}"}
              value={analytics.totalReading}
              label="min reading"
            />
            <StatCard
              emoji={"\u{1F525}"}
              value={analytics.currentStreak}
              label="day streak"
            />
            <StatCard
              emoji={"\u{1F4CA}"}
              value={analytics.averagePerDay}
              label="avg min/day"
            />
            <StatCard
              emoji={"\u{1F4C5}"}
              value={analytics.activeDays}
              label="active days"
            />
          </div>

          {/* Chart */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">
                {period === "week" ? "Daily" : "Weekly"} Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={chartData} />
            </CardContent>
          </Card>

          {/* Per-kid breakdown (parent only) */}
          {isParent && analytics.kidStats.length > 0 && (
            <KidBreakdown kidStats={analytics.kidStats} maxReading={maxKidReading} />
          )}
        </>
      )}
    </div>
  );
}
