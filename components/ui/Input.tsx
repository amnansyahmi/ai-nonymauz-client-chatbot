import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Input.module.css';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(styles.input, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(styles.select, className)} {...props}>
      {children}
    </select>
  );
}

/** Labelled field wrapper. Pair with <Input> / <Select>. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
