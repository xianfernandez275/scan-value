import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  plan: "free" | "premium";
  scans_used_this_month: number;
  scans_month_reset: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isPremium: boolean;
  scansRemaining: number;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  incrementScanCount: () => Promise<void>;
}

const FREE_SCAN_LIMIT = 10;
const FREE_COLLECTION_LIMIT = 25;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export { FREE_SCAN_LIMIT, FREE_COLLECTION_LIMIT };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const now = new Date();
    const { data } = await supabase
      .from("profiles")
      .select("plan, scans_used_this_month, scans_month_reset")
      .eq("id", userId)
      .single();

    if (data) {
      // Reset scan count if month has passed
      const resetDate = new Date(data.scans_month_reset);
      if (now >= resetDate) {
        const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
        await supabase
          .from("profiles")
          .update({ scans_used_this_month: 0, scans_month_reset: nextReset })
          .eq("id", userId);
        setProfile({ ...data, plan: data.plan as "free" | "premium", scans_used_this_month: 0, scans_month_reset: nextReset });
      } else {
        setProfile(data as Profile);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const incrementScanCount = async () => {
    if (!user || !profile) return;
    const newCount = profile.scans_used_this_month + 1;
    await supabase
      .from("profiles")
      .update({ scans_used_this_month: newCount })
      .eq("id", user.id);
    setProfile((p) => p ? { ...p, scans_used_this_month: newCount } : p);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isPremium = profile?.plan === "premium";
  const scansRemaining = isPremium ? Infinity : Math.max(0, FREE_SCAN_LIMIT - (profile?.scans_used_this_month || 0));

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, isPremium, scansRemaining, signOut, refreshProfile, incrementScanCount }}
    >
      {children}
    </AuthContext.Provider>
  );
};
