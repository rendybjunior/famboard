import type { FamilyMember } from "@/types/database";

export interface DailyTotal {
  date: string; // YYYY-MM-DD
  label: string; // "Mon", "Mar 1"
  readingMinutes: number;
  redemptionMinutes: number;
}

export interface WeeklyTotal {
  label: string;
  readingMinutes: number;
  redemptionMinutes: number;
}

export interface KidStats {
  kidId: string;
  displayName: string;
  avatar: string | null;
  totalReading: number;
  totalRedemption: number;
  averagePerDay: number;
  currentStreak: number;
  activeDays: number;
}

export interface AnalyticsSummary {
  dailyTotals: DailyTotal[];
  weeklyTotals: WeeklyTotal[];
  kidStats: KidStats[];
  totalReading: number;
  totalRedemption: number;
  averagePerDay: number;
  activeDays: number;
  currentStreak: number;
}

interface Entry {
  kid_id: string;
  minutes: number;
  created_at: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function getDateRange(period: "week" | "month") {
  const end = startOfDay(new Date());
  const start = new Date(end);
  start.setDate(start.getDate() - (period === "week" ? 6 : 29));
  return { start, end };
}

function buildDayMap(
  entries: Entry[],
  start: Date,
  end: Date,
): Map<string, number> {
  const map = new Map<string, number>();
  const d = new Date(start);
  while (d <= end) {
    map.set(toDateKey(d), 0);
    d.setDate(d.getDate() + 1);
  }
  for (const e of entries) {
    const key = e.created_at.slice(0, 10);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + e.minutes);
    }
  }
  return map;
}

function computeStreak(readingDayMap: Map<string, number>, end: Date): number {
  let streak = 0;
  const d = new Date(end);
  while (true) {
    const key = toDateKey(d);
    if (!readingDayMap.has(key) || readingDayMap.get(key)! <= 0) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function buildAnalyticsSummary(
  readings: Entry[],
  redemptions: Entry[],
  members: FamilyMember[],
  period: "week" | "month",
): AnalyticsSummary {
  const { start, end } = getDateRange(period);

  const readingDayMap = buildDayMap(readings, start, end);
  const redemptionDayMap = buildDayMap(redemptions, start, end);

  // Daily totals
  const dailyTotals: DailyTotal[] = [];
  const d = new Date(start);
  while (d <= end) {
    const key = toDateKey(d);
    dailyTotals.push({
      date: key,
      label:
        period === "week"
          ? DAY_NAMES[d.getDay()]
          : `${d.getMonth() + 1}/${d.getDate()}`,
      readingMinutes: readingDayMap.get(key) ?? 0,
      redemptionMinutes: redemptionDayMap.get(key) ?? 0,
    });
    d.setDate(d.getDate() + 1);
  }

  // Weekly totals (for month view, group into weeks)
  const weeklyTotals: WeeklyTotal[] = [];
  if (period === "month") {
    for (let i = 0; i < dailyTotals.length; i += 7) {
      const chunk = dailyTotals.slice(i, i + 7);
      const firstDay = chunk[0].date.slice(5); // MM-DD
      const lastDay = chunk[chunk.length - 1].date.slice(5);
      weeklyTotals.push({
        label: `${firstDay.replace("-", "/")} - ${lastDay.replace("-", "/")}`,
        readingMinutes: chunk.reduce((s, c) => s + c.readingMinutes, 0),
        redemptionMinutes: chunk.reduce((s, c) => s + c.redemptionMinutes, 0),
      });
    }
  }

  const totalReading = readings.reduce((s, e) => s + e.minutes, 0);
  const totalRedemption = redemptions.reduce((s, e) => s + e.minutes, 0);
  const days = period === "week" ? 7 : 30;
  const activeDays = [...readingDayMap.values()].filter((v) => v > 0).length;
  const currentStreak = computeStreak(readingDayMap, end);

  // Per-kid stats
  const kidMembers = members.filter((m) => m.role === "kid");
  const kidStats: KidStats[] = kidMembers.map((kid) => {
    const kidReadings = readings.filter((r) => r.kid_id === kid.id);
    const kidRedemptions = redemptions.filter((r) => r.kid_id === kid.id);
    const kidDayMap = buildDayMap(kidReadings, start, end);
    const kidTotal = kidReadings.reduce((s, e) => s + e.minutes, 0);
    return {
      kidId: kid.id,
      displayName: kid.display_name,
      avatar: kid.avatar,
      totalReading: kidTotal,
      totalRedemption: kidRedemptions.reduce((s, e) => s + e.minutes, 0),
      averagePerDay: Math.round(kidTotal / days),
      currentStreak: computeStreak(kidDayMap, end),
      activeDays: [...kidDayMap.values()].filter((v) => v > 0).length,
    };
  });

  return {
    dailyTotals,
    weeklyTotals,
    kidStats,
    totalReading,
    totalRedemption,
    averagePerDay: Math.round(totalReading / days),
    activeDays,
    currentStreak,
  };
}
