import type { PlanId } from './plans';

export type SubscriptionStatus = 'free' | 'pending' | 'active' | 'expired' | 'cancelled';

export type Subscription = {
  id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  billCode?: string;
  reference?: string;
  startsAt?: string;
  expiresAt?: string;
  amountCents?: number;
  updatedAt: string;
};

const STORAGE_KEY = 'mm-subscription';

export function readSubscription(): Subscription | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Subscription;
  } catch {
    return null;
  }
}

export function writeSubscription(subscription: Subscription): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
  } catch {
    // Ignore storage errors
  }
}

export function clearSubscription(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active' && subscription.status !== 'pending') return false;
  if (!subscription.expiresAt) return subscription.status === 'active';
  return new Date(subscription.expiresAt).getTime() > Date.now();
}
