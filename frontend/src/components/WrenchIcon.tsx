export default function WrenchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <circle cx="8.5" cy="8.5" r="5" strokeDasharray="24 8" />
      <line x1="5" y1="12" x2="2" y2="20" />
    </svg>
  );
}
