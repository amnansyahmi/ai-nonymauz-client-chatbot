import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import styles from './Button.module.css';

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'ok' | 'danger';
export type ButtonSize = 'sm' | 'lg';

const VARIANT: Record<Exclude<ButtonVariant, 'default'>, string> = {
  primary: styles.primary,
  ghost: styles.ghost,
  ok: styles.ok,
  danger: styles.danger
};
const SIZE: Record<ButtonSize, string> = { sm: styles.sm, lg: styles.lg };

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
};

/**
 * Returns the button className string. Use on non-button elements that should
 * look like a button — e.g. a Next <Link> or an <a>:
 *
 *   <Link className={buttonClasses({ variant: 'primary' })} href="…">…</Link>
 */
export function buttonClasses({ variant = 'default', size, block, className }: ButtonStyleOptions = {}): string {
  return cx(
    styles.btn,
    variant !== 'default' && VARIANT[variant],
    size && SIZE[size],
    block && styles.block,
    className
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

/**
 * The single source of truth for buttons. Styling is scoped in Button.module.css;
 * markup + variants live here. Change once, applies everywhere.
 *
 * Defaults to type="button" — pass type="submit" for form actions.
 */
export function Button({
  variant = 'default',
  size,
  block = false,
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, block, className })} {...props} />;
}
