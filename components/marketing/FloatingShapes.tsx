'use client';

import { useEffect, useState } from 'react';

const SHAPES = [
  { type: 'circle', size: 80, x: '10%', y: '20%', delay: 0, duration: 20 },
  { type: 'circle', size: 40, x: '85%', y: '15%', delay: 2, duration: 25 },
  { type: 'circle', size: 60, x: '75%', y: '70%', delay: 4, duration: 18 },
  { type: 'circle', size: 30, x: '15%', y: '80%', delay: 1, duration: 22 },
  { type: 'diamond', size: 50, x: '90%', y: '45%', delay: 3, duration: 24 },
  { type: 'diamond', size: 35, x: '5%', y: '50%', delay: 5, duration: 20 },
];

export default function FloatingShapes() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="floating-shapes" aria-hidden="true">
      {SHAPES.map((shape, i) => (
        <div
          key={i}
          className={`floating-shape floating-shape--${shape.type}`}
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`
          }}
        />
      ))}
    </div>
  );
}
