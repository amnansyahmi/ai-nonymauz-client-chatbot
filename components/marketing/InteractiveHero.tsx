'use client';

import { useRef, useState, type MouseEvent } from 'react';

type Props = {
  children: React.ReactNode;
};

export default function InteractiveHero({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className="interactive-hero"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        '--glow-x': `${mousePos.x}%`,
        '--glow-y': `${mousePos.y}%`,
        '--glow-opacity': isHovering ? '1' : '0'
      } as React.CSSProperties}
    >
      {children}
      <div className="interactive-hero__glow" aria-hidden="true" />
    </div>
  );
}
