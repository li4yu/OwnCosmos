"use client";

/**
 * 欢迎页星云层：软色气体云 + 细丝，颜色走主题 token，尺寸随视口适配。
 */
export function SplashNebula() {
  return (
    <div className="guest-nebula" aria-hidden="true">
      <span className="guest-nebula__cloud guest-nebula__cloud--a" />
      <span className="guest-nebula__cloud guest-nebula__cloud--b" />
      <span className="guest-nebula__cloud guest-nebula__cloud--c" />
      <span className="guest-nebula__cloud guest-nebula__cloud--d" />
      <span className="guest-nebula__veil" />
      <svg
        className="guest-nebula__filaments"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="guest-nebula-fil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(170,210,255,0)" />
            <stop offset="45%" stopColor="rgba(170,210,255,0.35)" />
            <stop offset="100%" stopColor="rgba(212,176,114,0)" />
          </linearGradient>
        </defs>
        <g
          fill="none"
          stroke="url(#guest-nebula-fil)"
          strokeWidth="0.35"
          strokeLinecap="round"
        >
          <path d="M62 8 C70 22, 78 30, 92 36" />
          <path d="M68 4 C76 18, 86 28, 98 30" opacity="0.55" />
          <path d="M8 58 C22 52, 34 62, 48 70" opacity="0.45" />
          <path d="M72 62 C80 72, 88 78, 96 88" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
}
