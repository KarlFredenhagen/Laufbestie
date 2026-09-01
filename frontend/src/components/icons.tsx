// Small monochrome line icons (stroke="currentColor") so they inherit whatever color the
// surrounding button/text already uses — no separate light/dark or active/inactive variants
// needed. Sized in `em` so they scale with font-size, same as the emoji they replace.

const base = {
  width: "1.15em",
  height: "1.15em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function UploadIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 20V11" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.4-3.5A7.96 7.96 0 0 1 4 12Z" />
    </svg>
  );
}

// A miniature version of the app's own icon (track ring + runner dot) — used as the header
// brand mark so it echoes the installed home-screen icon.
export function BrandIcon() {
  return (
    <svg width="1.5em" height="1.5em" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="11" cy="12" rx="8" ry="5.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="18.5" cy="7.5" r="2.4" fill="currentColor" />
    </svg>
  );
}
