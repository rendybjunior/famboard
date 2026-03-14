import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Family, FamilyMember } from "@/types/database";

export function useFamily(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family", familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("families")
        .select("*")
        .eq("id", familyId!)
        .single();
      if (error) throw error;
      return data as Family;
    },
    enabled: !!familyId,
  });
}

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: ["family-members", familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("family_id", familyId!)
        .order("created_at");
      if (error) throw error;
      return data as FamilyMember[];
    },
    enabled: !!familyId,
  });
}

export function usePendingCount(familyId: string | undefined) {
  return useQuery({
    queryKey: ["pending-count", familyId],
    queryFn: async () => {
      const [reading, redemptions] = await Promise.all([
        supabase
          .from("reading_entries")
          .select("id", { count: "exact", head: true })
          .eq("family_id", familyId!)
          .eq("status", "pending"),
        supabase
          .from("redemptions")
          .select("id", { count: "exact", head: true })
          .eq("family_id", familyId!)
          .eq("status", "pending"),
      ]);
      return (reading.count ?? 0) + (redemptions.count ?? 0);
    },
    enabled: !!familyId,
    refetchInterval: 30000,
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("families")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family"] }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: "parent" | "kid";
    }) => {
      const { error } = await supabase
        .from("family_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members"] }),
  });
}

export function useUpdateRedemptionRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      rate,
    }: {
      memberId: string;
      rate: number;
    }) => {
      const { error } = await supabase
        .from("family_members")
        .update({ redemption_rate: rate })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-members"] });
      qc.invalidateQueries({ queryKey: ["kid-balances"] });
    },
  });
}

export function useAddKid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      displayName,
      email,
      password,
    }: {
      displayName: string;
      email: string;
      password: string;
    }) => {
      // Create a temporary client so signing up the kid doesn't sign out the parent
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { data, error: signUpErr } = await tempClient.auth.signUp({
        email,
        password,
      });
      if (signUpErr) throw signUpErr;
      if (!data.user) throw new Error("Failed to create account");

      const { error: rpcErr } = await supabase.rpc("add_kid_to_family", {
        kid_user_id: data.user.id,
        kid_display_name: displayName,
      });
      if (rpcErr) throw rpcErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-members"] });
      qc.invalidateQueries({ queryKey: ["kid-balances"] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members"] }),
  });
}
