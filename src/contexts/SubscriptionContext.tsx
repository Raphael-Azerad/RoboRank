import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  subscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionState>({
  subscribed: false,
  loading: true,
  subscriptionEnd: null,
  checkSubscription: async () => {},
  startCheckout: async () => {},
  openPortal: async () => {},
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscribed(false);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscribed(data?.subscribed ?? false);
      setSubscriptionEnd(data?.subscription_end ?? null);
    } catch {
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const startCheckout = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  const openPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("customer-portal");
    if (error) throw error;
    if (data?.url) window.open(data.url, "_blank");
  }, []);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  // Re-check on auth change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });
    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscribed, loading, subscriptionEnd, checkSubscription, startCheckout, openPortal }}>
      {children}
    </SubscriptionContext.Provider>
  );
}
