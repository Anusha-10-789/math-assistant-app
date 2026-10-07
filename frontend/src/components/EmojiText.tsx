import { Fragment } from "react";

// Windows can't draw flag emoji (🇮🇳 shows as the letters "IN"), so India's
// flag is drawn here instead, sized like the text around it.
export function IndiaFlag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={`inline-block h-[0.9em] w-[1.35em] align-[-0.1em] ${className}`} role="img" aria-label="Flag of India">
      <rect width="30" height="20" rx="1.5" fill="#ffffff" />
      <rect width="30" height="6.67" rx="1.5" fill="#ff9933" />
      <rect y="6.4" width="30" height="0.4" fill="#ff9933" />
      <rect y="13.33" width="30" height="6.67" rx="1.5" fill="#138808" />
      <rect y="13.2" width="30" height="0.4" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.5" />
      <circle cx="15" cy="10" r="0.5" fill="#000080" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1="15" y1="10" x2={15 + 2.6 * Math.cos(a)} y2={10 + 2.6 * Math.sin(a)} stroke="#000080" strokeWidth="0.25" />;
      })}
    </svg>
  );
}

const INDIA = "🇮🇳";

// Text that may contain 🇮🇳, with each one drawn as the flag above.
export default function EmojiText({ text }: { text: string }) {
  if (!text.includes(INDIA)) return <>{text}</>;
  return (
    <>
      {text.split(INDIA).map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <IndiaFlag />}
          {part}
        </Fragment>
      ))}
    </>
  );
}
