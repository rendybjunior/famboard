import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Redemption, EntryStatus } from "@/types/database";

interface RedemptionWithKid extends Redemption {
  kid: { display_name: string } | null;
}

interface Filters {
  familyId: string;
  kidId?: string;
  status?: EntryStatus;
  limit?: number;
}

export function useRedemptions(filters: Filters) {
  return useQuery({
    queryKey: ["redemptions", filters],
    queryFn: async () => {
      let query = supabase
        .from("redemptions")
        .select("*, kid:family_members!kid_id(display_name)")
        .eq("family_id", filters.familyId)
        .order("created_at", { ascending: false });

      if (filters.kidId) query = query.eq("kid_id", filters.kidId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data as RedemptionWithKid[];
    },
    enabled: !!filters.familyId,
  });
}

export function useHasPendingRedemption(kidId: string | undefined) {
  return useQuery({
    queryKey: ["pending-redemption", kidId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("redemptions")
        .select("id", { count: "exact", head: true })
        .eq("kid_id", kidId!)
        .eq("status", "pending");
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!kidId,
  });
}

export function useSubmitRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      family_id: string;
      kid_id: string;
      minutes: number;
    }) => {
      const { error } = await supabase.from("redemptions").insert({
        family_id: entry.family_id,
        kid_id: entry.kid_id,
        minutes: entry.minutes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["pending-redemption"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    },
  });
}

export function useReviewRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entryId,
      status,
      reviewedBy,
      reviewNote,
    }: {
      entryId: string;
      status: "approved" | "rejected";
      reviewedBy: string;
      reviewNote?: string;
    }) => {
      const { data, error } = await supabase
        .from("redemptions")
        .update({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote || null,
        })
        .eq("id", entryId)
        .eq("status", "pending")
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("This entry was already reviewed.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["pending-redemption"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
      qc.invalidateQueries({ queryKey: ["kid-balances"] });
    },
  });
}

export function useCancelRedemption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("redemptions")
        .update({ status: "cancelled" })
        .eq("id", entryId)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redemptions"] });
      qc.invalidateQueries({ queryKey: ["pending-redemption"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    },
  });
}
