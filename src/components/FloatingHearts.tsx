import { useMemo } from 'react';

interface HeartSpec {
  id: number;
  left: string;
  size: string;
  duration: string;
  delay: string;
}

export function FloatingHearts() {
  const hearts = useMemo<HeartSpec[]>(() => {
    return Array.from({ length: 14 }, (_, idx) => {
      const seed = (idx * 37 + 13) % 100;
      const sizeSeed = (idx * 19 + 7) % 16;
      const durSeed = (idx * 23 + 11) % 7;
      const delaySeed = (idx * 29 + 5) % 6;
      return {
        id: idx,
        left: `${seed}%`,
        size: `${12 + sizeSeed}px`,
        duration: `${7 + durSeed}s`,
        delay: `${delaySeed}s`,
      };
    });
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {hearts.map((h) => (
        <span
          key={h.id}
          className="heart-particle select-none"
          style={{
            left: h.left,
            fontSize: h.size,
            animationDuration: h.duration,
            animationDelay: h.delay,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
