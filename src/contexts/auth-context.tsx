import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { FamilyMember } from "@/types/database";

interface AuthContextType {
  session: Session | null;
  membership: FamilyMember | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<FamilyMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembership = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .single();
    setMembership(data as FamilyMember | null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchMembership(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        fetchMembership(s.user.id);
      } else {
        setMembership(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchMembership]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Sign up failed");
    return data.user.id;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMembership(null);
  };

  const refreshMembership = async () => {
    if (session) {
      await fetchMembership(session.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        membership,
        isLoading,
        signIn,
        signUp,
        signOut,
        refreshMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
