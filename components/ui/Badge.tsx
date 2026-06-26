import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Badge.module.css';

export type BadgeVariant = 'neutral' | 'pending' | 'success' | 'info' | 'danger';

const VARIANT: Record<BadgeVariant, string> = {
  neutral: styles.neutral,
  pending: styles.pending,
  success: styles.success,
  info: styles.info,
  danger: styles.danger
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

/** Status pill. Styling scoped in Badge.module.css. */
export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cx(styles.badge, VARIANT[variant], className)} {...props} />;
}
