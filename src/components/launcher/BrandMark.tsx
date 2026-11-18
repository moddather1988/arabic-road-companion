/** Placeholder car emblem – swap for the owner's car brand later. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 52" className={className} aria-label="Moddather" role="img">
      <ellipse cx="75" cy="26" rx="71" ry="22" fill="none" stroke="currentColor" strokeWidth="3" />
      <text
        x="75"
        y="33"
        textAnchor="middle"
        fontFamily="Rajdhani, sans-serif"
        fontWeight="700"
        fontSize="22"
        letterSpacing="3"
        fill="currentColor"
      >
        MODDATHER
      </text>
    </svg>
  );
}
