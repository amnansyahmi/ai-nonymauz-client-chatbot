import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './IconButton.module.css';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary';
  size?: 'sm';
  /** Required — icon-only buttons need an accessible label. */
  'aria-label': string;
};

/** Circular icon-only button. Styling scoped in IconButton.module.css. */
export function IconButton({
  variant = 'default',
  size,
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.iconBtn, variant === 'primary' && styles.primary, size === 'sm' && styles.sm, className)}
      {...props}
    />
  );
}
