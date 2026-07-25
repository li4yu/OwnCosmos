"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  getModuleIntro,
  type ChroniclePage,
  type FocusKey,
} from "@/components/landing/module-intros";

type ModuleChapterProps = {
  moduleId: FocusKey;
  onActive?: (id: FocusKey) => void;
};

export function ModuleChapter({ moduleId, onActive }: ModuleChapterProps) {
  const mod = getModuleIntro(moduleId);
  const pages = mod.pages;
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [animating, setAnimating] = useState(false);
  const [visible, setVisible] = useState<ChroniclePage>(pages[0]);
  const [inView, setInView] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visibleNow = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        setInView(visibleNow);
        if (visibleNow) {
          el.classList.add("is-in");
          onActive?.(moduleId);
        }
      },
      { threshold: [0.35, 0.55] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [moduleId, onActive]);

  const goTo = useCallback(
    (next: number, direction: 1 | -1) => {
      if (lockRef.current) return;
      const list = getModuleIntro(moduleId).pages;
      const total = list.length;
      const target = ((next % total) + total) % total;
      if (target === index) return;

      lockRef.current = true;
      setDir(direction);
      setAnimating(true);

      window.setTimeout(() => {
        setIndex(target);
        setVisible(list[target]);
        setAnimating(false);
        lockRef.current = false;
      }, 420);
    },
    [index, moduleId],
  );

  useEffect(() => {
    if (!inView) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goTo(index + 1, 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1, -1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inView, goTo, index]);

  function onStageClick(e: MouseEvent<HTMLElement>) {
    const t = e.target as HTMLElement;
    if (t.closest("[data-chronicle-control]")) return;
    goTo(index + 1, 1);
  }

  return (
    <section
      ref={sectionRef}
      id={moduleId}
      className="module-chapter"
      aria-label={`${mod.name} · 功能雅名`}
      onClick={onStageClick}
    >
      <div className="module-chapter__index" aria-hidden="true">
        {mod.index}
      </div>

      <div className="module-chapter__main">
        <header className="module-chapter__head">
          <p className="module-chapter__eyebrow">
            {mod.name}
            <span>{mod.en}</span>
          </p>
          <p className="module-chapter__blurb">{mod.blurb}</p>
          <p className="module-chapter__hint">点击空白 · 翻阅雅名</p>
        </header>

        <div
          key={`${moduleId}-${visible.name}`}
          className={`module-chapter__stage ${animating ? "is-leaving" : "is-settled"}`}
          data-dir={dir}
          aria-live="polite"
        >
          <h2 className="module-chapter__name">{visible.name}</h2>
          <p className="module-chapter__tip">{visible.tip}</p>
          <p className="module-chapter__body">{visible.body}</p>
        </div>

        <div
          className="module-chapter__orbit"
          data-chronicle-control
          role="tablist"
          aria-label="雅名进度"
        >
          {pages.map((p, i) => (
            <button
              key={p.name}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={p.name}
              className={`module-chapter__star ${i === index ? "is-active" : ""} ${i < index ? "is-passed" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                goTo(i, i > index ? 1 : -1);
              }}
            />
          ))}
        </div>

        <div className="module-chapter__footer" data-chronicle-control>
          <button
            type="button"
            className="module-chapter__nav"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index - 1, -1);
            }}
          >
            回望
          </button>
          <span className="module-chapter__count">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(pages.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="module-chapter__nav"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1, 1);
            }}
          >
            前行
          </button>
        </div>
      </div>
    </section>
  );
}
