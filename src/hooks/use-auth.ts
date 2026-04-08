import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthUser = Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"];

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [checkingSub, setCheckingSub] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const checkSubscription = useCallback(async (isBackground = false) => {
    if (!user) {
      setSubscribed(false);
      setSubscriptionEnd(null);
      if (!isBackground) setCheckingSub(false);
      return;
    }

    if (!isBackground) setCheckingSub(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data) {
        setSubscribed(!!data.subscribed);
        setSubscriptionEnd(data.subscription_end || null);
      }
    } catch {
      setSubscribed(false);
      setSubscriptionEnd(null);
    } finally {
      if (!isBackground) setCheckingSub(false);
    }
  }, [user]);

  const loadAccessState = useCallback(async (nextUser: AuthUser | null) => {
    setUser(nextUser);

    if (!nextUser) {
      setIsAdmin(false);
      setSubscribed(false);
      setSubscriptionEnd(null);
      setCheckingSub(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [{ data: roleData }, { data: subscriptionData, error: subscriptionError }] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", nextUser.id)
          .eq("role", "admin")
          .maybeSingle(),
        supabase.functions.invoke("check-subscription"),
      ]);

      setIsAdmin(!!roleData);

      if (!subscriptionError && subscriptionData) {
        setSubscribed(!!subscriptionData.subscribed);
        setSubscriptionEnd(subscriptionData.subscription_end || null);
      } else {
        setSubscribed(false);
        setSubscriptionEnd(null);
      }
    } catch {
      setIsAdmin(false);
      setSubscribed(false);
      setSubscriptionEnd(null);
    } finally {
      setLoading(false);
      setCheckingSub(false);
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      void loadAccessState(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAccessState(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadAccessState]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      void checkSubscription();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return { user, loading, isAdmin, subscribed, subscriptionEnd, checkingSub, checkSubscription };
}
