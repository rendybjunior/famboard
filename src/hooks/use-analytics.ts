import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getDateRange, buildAnalyticsSummary } from "@/lib/analytics-utils";
import type { FamilyMember } from "@/types/database";

export function useAnalyticsData(params: {
  familyId: string;
  kidId?: string;
  period: "week" | "month";
  members: FamilyMember[];
}) {
  const { familyId, kidId, period, members } = params;

  return useQuery({
    queryKey: ["analytics", familyId, kidId, period],
    queryFn: async () => {
      const { start } = getDateRange(period);
      const since = start.toISOString();

      let readingQuery = supabase
        .from("reading_entries")
        .select("kid_id, minutes, created_at")
        .eq("family_id", familyId)
        .eq("status", "approved")
        .gte("created_at", since);

      let redemptionQuery = supabase
        .from("redemptions")
        .select("kid_id, minutes, created_at")
        .eq("family_id", familyId)
        .eq("status", "approved")
        .gte("created_at", since);

      if (kidId) {
        readingQuery = readingQuery.eq("kid_id", kidId);
        redemptionQuery = redemptionQuery.eq("kid_id", kidId);
      }

      const [readingResult, redemptionResult] = await Promise.all([
        readingQuery,
        redemptionQuery,
      ]);

      if (readingResult.error) throw readingResult.error;
      if (redemptionResult.error) throw redemptionResult.error;

      return buildAnalyticsSummary(
        readingResult.data,
        redemptionResult.data,
        members,
        period,
      );
    },
    enabled: !!familyId && members.length > 0,
    staleTime: 60_000,
  });
}
