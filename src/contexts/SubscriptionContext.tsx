import { createContext, useContext, type ReactNode } from "react";

/**
 * Subscription system is currently DISABLED — RoboRank is free for everyone.
 *
 * This context is intentionally left in place (rather than deleted) so we can
 * re-enable paid plans in the future without rewiring every component that
 * reads `subscribed`. The Stripe edge functions (create-checkout,
 * check-subscription, customer-portal) and the Stripe price config are also
 * preserved on the backend.
 *
 * To turn paid plans back on:
 *   1. Restore the previous version of this file from git history.
 *   2. Re-add the SubscriptionProvider's effects + Stripe invokes.
 */

interface SubscriptionState {
  subscribed: boolean;
  loading: boolean;
  subscriptionEnd: string | null;
  source: string | null;
  checkSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
}

const noop = async () => {};

const FREE_FOR_EVERYONE: SubscriptionState = {
  subscribed: true,
  loading: false,
  subscriptionEnd: null,
  source: "free",
  checkSubscription: noop,
  startCheckout: noop,
  openPortal: noop,
};

const SubscriptionContext = createContext<SubscriptionState>(FREE_FOR_EVERYONE);

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  return (
    <SubscriptionContext.Provider value={FREE_FOR_EVERYONE}>
      {children}
    </SubscriptionContext.Provider>
  );
}
