'use client';

import React from 'react';

interface BitePassLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  variant?: 'light' | 'dark' | 'terracotta';
}

/**
 * BitePass Clean Flat Design Logo Mark
 * A gourmet dining cloche dome sliced by an energetic lightning-bolt separation gap (negative space).
 */
export function BitePassLogo({
  className = '',
  size = 32,
  showWordmark = false,
  variant = 'terracotta',
}: BitePassLogoProps) {
  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Flat Brand Icon Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="BitePass Logo"
      >
        {/* Squircle Container */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="22"
          fill={isDark ? '#1C1917' : '#FAF9F5'}
          stroke={isDark ? '#44403C' : '#EAE7DF'}
          strokeWidth="2.5"
        />

        {/* Minimalist Cloche Handle */}
        <circle
          cx="50"
          cy="18"
          r="4"
          fill="none"
          stroke="#BF3E21"
          strokeWidth="2.6"
        />

        {/* Flat Platter Base */}
        <rect x="17" y="66" width="66" height="4.5" rx="2.25" fill="#1C1917" />

        {/* Left Cloche Wing (Terracotta #BF3E21) */}
        <path
          d="M 22 64 C 22 36 35 24 48.5 22.5 L 44 39.5 L 50 39.5 L 45.5 64 Z"
          fill="#BF3E21"
        />

        {/* Right Cloche Wing (Terracotta #BF3E21) */}
        <path
          d="M 51.5 22.5 C 65 24 78 36 78 64 L 48.5 64 L 53 42 L 47 42 Z"
          fill="#BF3E21"
        />

        {/* Flat Dining Fork Tines (Negative-space accents in platter) */}
        <line x1="46" y1="67" x2="46" y2="70" stroke={isDark ? '#1C1917' : '#FAF9F5'} strokeWidth="1" strokeLinecap="round" />
        <line x1="50" y1="67" x2="50" y2="70" stroke={isDark ? '#1C1917' : '#FAF9F5'} strokeWidth="1" strokeLinecap="round" />
        <line x1="54" y1="67" x2="54" y2="70" stroke={isDark ? '#1C1917' : '#FAF9F5'} strokeWidth="1" strokeLinecap="round" />
      </svg>

      {/* Wordmark */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-sans text-lg font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-culinary-text'
              }`}
            >
              Bite<span className="text-culinary-terracotta">Pass</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100/90 text-culinary-terracotta border border-orange-200">
              Fast Pass
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-[0.2em] text-culinary-muted uppercase">
            The Culinary Fast Pass
          </span>
        </div>
      )}
    </div>
  );
}
