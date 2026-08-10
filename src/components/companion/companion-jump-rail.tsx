"use client";

import Link from "next/link";
import type { CompanionJump } from "@/ai/companion-jumps";

export function CompanionJumpRail({ jumps }: { jumps: CompanionJump[] }) {
  if (jumps.length === 0) return null;
  return (
    <div className="companion-jump">
      <p className="companion-jump__label">快捷跳转</p>
      <ul className="companion-jump__list">
        {jumps.map((j) => (
          <li key={j.id}>
            <Link href={j.href} className="companion-jump__card">
              <span className="companion-jump__eyebrow">{j.eyebrow}</span>
              <span className="companion-jump__title">{j.title}</span>
              <span className="companion-jump__go">打开</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
