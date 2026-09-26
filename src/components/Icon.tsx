// Inline line-icon set (design plan §2.4) — stroke 1.6, round caps, 24×24.
// Replaces emoji chrome; emojis stay only inside chat copy.

const PATHS: Record<string, string> = {
  house: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  inbox: "M3 5h18v14H3zM3 12h5l1.5 2.5h5L16 12h5",
  today: "M7 3v3M17 3v3M4 8.5h16M5 5.5h14v15H5zM10 12.5l2 2 3.5-3.5",
  board: "M4 4h6v16H4zM14 4h6v9h-6z",
  tasks: "M5 5h14v16H5zM8.5 9.5l2 2 4-4M8.5 15.5l2 2 4-4",
  ticket: "M4 7h16v3.5a1.5 1.5 0 0 0 0 3V17H4v-3.5a1.5 1.5 0 0 0 0-3zM11 7v10",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l1.8-1.2-1.4-3-2.1.6a6.9 6.9 0 0 0-1.8-1L15 5.2h-3.4l-.5 2.2a6.9 6.9 0 0 0-1.8 1l-2.1-.6-1.4 3L7.6 12l-1.8 1.2 1.4 3 2.1-.6c.5.4 1.1.8 1.8 1l.5 2.2H15l.5-2.2c.7-.2 1.3-.6 1.8-1l2.1.6 1.4-3z",
  chevronRight: "M9 5l7 7-7 7",
  chevronLeft: "M15 5l-7 7 7 7",
  check: "M4.5 12.5l5 5 10-11",
  x: "M6 6l12 12M18 6L6 18",
  copy: "M9 9h10v12H9zM5 15V3h10v2",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  wifi: "M2.5 9a14 14 0 0 1 19 0M5.8 12.5a9 9 0 0 1 12.4 0M9.2 16a4.4 4.4 0 0 1 5.6 0M12 19.5h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2",
  alert: "M12 3 1.5 21h21zM12 9.5v5M12 17.5h.01",
  alertCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5M12 16h.01",
  send: "M12 20V5M6 11l6-6 6 6",
  arrowRight: "M4 12h15M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  printer: "M7 8V3h10v5M5 8h14a1 1 0 0 1 1 1v6h-4v6H8v-6H4V9a1 1 0 0 1 1-1zM8 16h8",
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  bot: "M8 8h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM12 8V4.5M9.5 13h.01M14.5 13h.01",
  sparkles: "M12 4l1.8 4.7L18.5 10l-4.7 1.8L12 16l-1.8-4.2L5.5 10l4.7-1.3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z",
  lock: "M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11",
  pin: "M12 21s7-6.5 7-11.5a7 7 0 0 0-14 0C5 14.5 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

export function Icon({
  name,
  size = 18,
  className = "",
}: {
  name: keyof typeof PATHS | string;
  size?: number;
  className?: string;
}) {
  const d = PATHS[name] ?? PATHS.sparkles;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
