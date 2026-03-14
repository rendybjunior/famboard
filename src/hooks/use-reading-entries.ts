import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ReadingEntry, EntryStatus } from "@/types/database";

interface ReadingEntryWithKid extends ReadingEntry {
  kid: { display_name: string } | null;
}

interface Filters {
  familyId: string;
  kidId?: string;
  status?: EntryStatus;
  limit?: number;
}

export function useReadingEntries(filters: Filters) {
  return useQuery({
    queryKey: ["reading-entries", filters],
    queryFn: async () => {
      let query = supabase
        .from("reading_entries")
        .select("*, kid:family_members!kid_id(display_name)")
        .eq("family_id", filters.familyId)
        .order("created_at", { ascending: false });

      if (filters.kidId) query = query.eq("kid_id", filters.kidId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
      if (error) throw error;
      return data as ReadingEntryWithKid[];
    },
    enabled: !!filters.familyId,
  });
}

export function useSubmitReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      family_id: string;
      kid_id: string;
      minutes: number;
      book_title?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("reading_entries").insert({
        family_id: entry.family_id,
        kid_id: entry.kid_id,
        minutes: entry.minutes,
        book_title: entry.book_title || null,
        notes: entry.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reading-entries"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    },
  });
}

export function useReviewReading() {
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
        .from("reading_entries")
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
      qc.invalidateQueries({ queryKey: ["reading-entries"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
      qc.invalidateQueries({ queryKey: ["kid-balances"] });
    },
  });
}

export function useCancelReading() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from("reading_entries")
        .update({ status: "cancelled" })
        .eq("id", entryId)
        .eq("status", "pending");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reading-entries"] });
      qc.invalidateQueries({ queryKey: ["pending-count"] });
    },
  });
}
