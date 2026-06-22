'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type PullToRefreshProps = {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  refreshingLabel?: string;
  pullLabel?: string;
};

const DEFAULT_THRESHOLD = 80;
const DEFAULT_MAX_PULL = 140;

/**
 * Wrap a scrollable region to add a touch-only pull-to-refresh gesture.
 * No-op on desktop (no `touchstart` fires).
 *
 * Calls `onRefresh` when the user pulls down past `threshold` px and
 * releases. Shows a spinner while the promise is pending.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = DEFAULT_THRESHOLD,
  maxPull = DEFAULT_MAX_PULL,
  disabled = false,
  refreshingLabel = 'Refreshing…',
  pullLabel = 'Pull to refresh'
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || disabled) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, disabled, onRefresh]);

  useEffect(() => {
    if (disabled) return;
    const node = containerRef.current;
    if (!node) return;

    function onTouchStart(event: TouchEvent) {
      if (isRefreshing) return;
      const scrollTop = node?.scrollTop ?? 0;
      if (scrollTop > 0) return;
      startYRef.current = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event: TouchEvent) {
      if (startYRef.current === null) return;
      const scrollTop = node?.scrollTop ?? 0;
      if (scrollTop > 0) {
        startYRef.current = null;
        setPullDistance(0);
        return;
      }
      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startYRef.current;
      if (delta <= 0) return;
      // Apply resistance so pulling gets harder the further you pull.
      const resisted = Math.min(maxPull, delta * 0.55);
      setPullDistance(resisted);
    }

    function onTouchEnd() {
      if (startYRef.current === null) return;
      startYRef.current = null;
      if (pullDistance >= threshold) {
        void handleRefresh();
      } else {
        setPullDistance(0);
      }
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    node.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      node.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, handleRefresh, isRefreshing, maxPull, pullDistance, threshold]);

  const stateClass = isRefreshing
    ? 'is-refreshing'
    : pullDistance > 0
      ? 'is-pulling'
      : '';

  return (
    <div
      ref={containerRef}
      className={`pull-to-refresh ${stateClass}`}
      style={{ ['--pull-distance' as string]: `${pullDistance}px` }}
    >
      <div
        className="pull-to-refresh__indicator"
        role="status"
        aria-live="polite"
        aria-label={isRefreshing ? refreshingLabel : pullLabel}
      >
        <span className="pull-to-refresh__spinner" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
