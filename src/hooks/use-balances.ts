import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { KidBalance } from "@/types/database";

export function useKidBalance(kidId: string | undefined) {
  return useQuery({
    queryKey: ["kid-balances", kidId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kid_balances")
        .select("*")
        .eq("kid_id", kidId!)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return (data as KidBalance | null) ?? {
        kid_id: kidId!,
        family_id: "",
        display_name: "",
        redemption_rate: 1,
        total_reading_minutes: 0,
        earned_screen_minutes: 0,
        used_screen_minutes: 0,
        balance: 0,
      };
    },
    enabled: !!kidId,
  });
}

export function useFamilyBalances(familyId: string | undefined) {
  return useQuery({
    queryKey: ["kid-balances", "family", familyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kid_balances")
        .select("*")
        .eq("family_id", familyId!);
      if (error) throw error;
      return data as KidBalance[];
    },
    enabled: !!familyId,
  });
}
