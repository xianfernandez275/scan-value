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
  scansUsed: number;
  scansRemaining: number;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
    const { data } = await supabase
      .from("profiles")
      .select("plan, scans_used_this_month, scans_month_reset")
      .eq("id", userId)
      .single();

    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
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
  // The counter is server-managed (reset + increment happen in the
  // identify-collectible function); past the reset date we display it as 0.
  const monthElapsed = profile ? new Date() >= new Date(profile.scans_month_reset) : false;
  const scansUsed = monthElapsed ? 0 : profile?.scans_used_this_month || 0;
  const scansRemaining = isPremium ? Infinity : Math.max(0, FREE_SCAN_LIMIT - scansUsed);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, isPremium, scansUsed, scansRemaining, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
