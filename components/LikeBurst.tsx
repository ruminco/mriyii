'use client';

import React from 'react';
import type { ThemePreset } from '@/models/User';

const BURST_VECTORS = [
  { bx: '-46px', by: '-42px', icon: '❤️' },
  { bx: '0px', by: '-56px', icon: '✨' },
  { bx: '48px', by: '-40px', icon: '💖' },
  { bx: '-62px', by: '-8px', icon: '✨' },
  { bx: '64px', by: '-6px', icon: '💎' },
  { bx: '-40px', by: '36px', icon: '❤️' },
  { bx: '42px', by: '34px', icon: '✨' },
  { bx: '-18px', by: '-64px', icon: '💎' },
  { bx: '20px', by: '-62px', icon: '❤️' },
  { bx: '0px', by: '48px', icon: '💖' },
];

interface LikeBurstProps {
  burstKey: number;
  themePreset: ThemePreset;
}

export function LikeBurst({ burstKey, themePreset }: LikeBurstProps) {
  if (burstKey <= 0) return null;

  const glowColor = themePreset === 'rose_luxury' ? '#FB7185' : '#34D399';

  return (
    <span
      key={burstKey}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-visible z-30"
    >
      {BURST_VECTORS.map((vec, idx) => (
        <span
          key={`${burstKey}-${idx}`}
          className="like-burst-particle text-base select-none"
          style={
            {
              '--bx': vec.bx,
              '--by': vec.by,
              color: glowColor,
              textShadow: `0 0 12px ${glowColor}`,
              animationDelay: `${(idx % 3) * 35}ms`,
            } as React.CSSProperties
          }
        >
          {vec.icon}
        </span>
      ))}
    </span>
  );
}
