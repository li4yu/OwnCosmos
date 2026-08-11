"use client";

/**
 * 欢迎页轻量角隅装饰（无环轨符印）。
 * 位置/尺寸 clamp 适配视口；欢迎页固定深空色。
 */

export function SplashStaticPatterns() {
  return (
    <div className="guest-pattern-field" aria-hidden="true">
      <svg
        className="guest-pattern guest-pattern--corner guest-pattern--corner-tr"
        viewBox="0 0 120 120"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        >
          <path d="M118 8 C86 10, 72 28, 70 58" opacity="0.55" />
          <path d="M112 4 C78 8, 62 32, 62 66" opacity="0.3" />
        </g>
        <g fill="currentColor">
          <circle cx="100" cy="14" r="1.4" opacity="0.55" />
          <circle cx="70" cy="58" r="1.2" opacity="0.4" />
        </g>
      </svg>

      <span className="guest-pattern guest-pattern--dot guest-pattern--d1" />
      <span className="guest-pattern guest-pattern--dot guest-pattern--d2" />
      <span className="guest-pattern guest-pattern--dot guest-pattern--d3" />
    </div>
  );
}
