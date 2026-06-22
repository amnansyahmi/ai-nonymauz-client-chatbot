'use client';

import { useRouter } from 'next/navigation';
import { useRef, type MouseEvent, type ReactNode } from 'react';

type Props = {
  href: string;
  className?: string;
  children: ReactNode;
};

const COLORS = ['#10a37f', '#34d399', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#facc15'];

/**
 * A link that fires a celebratory confetti burst from the button, then
 * navigates. DOM-particle confetti (no canvas/deps). Skips the effect and
 * navigates immediately under reduced-motion or modified clicks.
 */
export default function ConfettiLink({ href, className, children }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);

  function burst(x: number, y: number) {
    const layer = document.createElement('div');
    layer.className = 'mm-confetti-layer';
    document.body.appendChild(layer);

    for (let i = 0; i < 30; i++) {
      const piece = document.createElement('span');
      piece.className = 'mm-confetti-piece';
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 130;
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      piece.style.background = COLORS[i % COLORS.length];
      piece.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      piece.style.setProperty('--dy', `${Math.sin(angle) * dist - (70 + Math.random() * 70)}px`);
      piece.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
      piece.style.animationDelay = `${Math.random() * 70}ms`;
      if (i % 2 === 0) piece.style.borderRadius = '50%';
      layer.appendChild(piece);
    }

    window.setTimeout(() => layer.remove(), 1400);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    event.preventDefault();
    const rect = ref.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.85;
    burst(x, y);
    window.setTimeout(() => router.push(href), 430);
  }

  return (
    <a ref={ref} href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
