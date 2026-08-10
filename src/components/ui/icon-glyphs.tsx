import type { SVGProps } from "react";

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 14, ...rest }: GlyphProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
    ...rest,
  };
}

export function IconCalendar(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 9.5h17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconChevronLeft(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChevronRight(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M9.5 5.5 16 12l-6.5 6.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowLeft(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M15.5 5.5 9 12l6.5 6.5M9 12h11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSend(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4.5 11.2 19.2 4.6c.5-.2 1 .3.8.8L13.4 19.4c-.2.5-.9.4-1.1-.1l-2.1-5.4-5.4-2.1c-.5-.2-.6-.9-.1-1.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconStop(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <rect
        x="6.5"
        y="6.5"
        width="11"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function IconRefresh(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M19.5 12a7.5 7.5 0 1 1-2.1-5.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M19.5 4.5v5h-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClose(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTrash(props: GlyphProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M9 4.5h6M5.5 7h13M9.5 7v11.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V7M10.5 10.5v6M13.5 10.5v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
