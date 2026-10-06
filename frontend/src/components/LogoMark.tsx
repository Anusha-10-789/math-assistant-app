import { useId } from "react";

interface LogoMarkProps {
  className?: string;
}

// The app's logo: an open book with a sparkle above it — reading, with a
// touch of AI magic — on the brand's violet-to-pink tile. The same drawing is
// saved as public/favicon.svg for the browser tab.
export default function LogoMark({ className = "" }: LogoMarkProps) {
  // Unique per copy: the sidebar and phone top bar both draw the logo, and a
  // shared gradient id breaks the visible one when the other is hidden.
  const gradientId = `logo-tile-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="AI Assistant for Kids logo">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7d58f6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />

      {/* Open book */}
      <path d="M32 49 C25 44 17 43 10 44.5 V24 C17 22.5 25 23.5 32 29 Z" fill="#ffffff" />
      <path d="M32 49 C39 44 47 43 54 44.5 V24 C47 22.5 39 23.5 32 29 Z" fill="#efeaff" />
      <path d="M32 29 V49" stroke="#c4b5fd" strokeWidth="1.6" strokeLinecap="round" />
      <g stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M15 31 C19 30.4 23 31 27 33" />
        <path d="M15 37 C19 36.4 23 37 27 39" />
        <path d="M37 33 C41 31 45 30.4 49 31" />
        <path d="M37 39 C41 37 45 36.4 49 37" />
      </g>

      {/* Sparkles: the "AI" in the name */}
      <path d="M32 6 C33 12 34 13 40 14 C34 15 33 16 32 22 C31 16 30 15 24 14 C30 13 31 12 32 6 Z" fill="#fde047" />
      <path d="M47 9 C47.5 11.5 48 12 50.5 12.5 C48 13 47.5 13.5 47 16 C46.5 13.5 46 13 43.5 12.5 C46 12 46.5 11.5 47 9 Z" fill="#fef9c3" />
    </svg>
  );
}
