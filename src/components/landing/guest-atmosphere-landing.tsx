"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ModuleChapter } from "@/components/landing/module-chapter";
import {
  MODULE_INTROS,
  getModuleIntro,
  type FocusKey,
} from "@/components/landing/module-intros";
import { ThemeToggle } from "@/components/theme-toggle";

type GateMode = "login" | "register";

const ORBIT_PILLS: { key: FocusKey; label: string }[] = [
  { key: "past", label: "昔时往 · 过去" },
  { key: "now", label: "今时际 · 当下" },
  { key: "future", label: "来日途 · 未来" },
  { key: "focus", label: "凝时 · 专注" },
];

type GuestAtmosphereLandingProps = {
  loggedIn?: boolean;
  userName?: string | null;
};

export function GuestAtmosphereLanding({
  loggedIn = false,
  userName,
}: GuestAtmosphereLandingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gateRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const paramMode: GateMode | null =
    authParam === "register"
      ? "register"
      : authParam === "login"
        ? "login"
        : null;

  const [focus, setFocus] = useState<FocusKey>("past");
  const [panelOpen, setPanelOpen] = useState(false);
  const [gateMode, setGateMode] = useState<GateMode | null>(paramMode);

  const onModuleActive = useCallback((id: FocusKey) => {
    setFocus(id);
  }, []);

  function selectFocus(key: FocusKey) {
    setFocus(key);
    setPanelOpen(true);
  }

  function syncAuthUrl(next: GateMode | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("auth", next);
    else params.delete("auth");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openGate(mode: GateMode) {
    setGateMode(mode);
    syncAuthUrl(mode);
    requestAnimationFrame(() => {
      gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function closeGate() {
    setGateMode(null);
    syncAuthUrl(null);
  }

  function scrollToModule(id: FocusKey) {
    setFocus(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    if (!paramMode) return;
    setGateMode(paramMode);
    requestAnimationFrame(() => {
      gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [paramMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: {
      x: number;
      y: number;
      r: number;
      a: number;
      s: number;
      p: number;
    }[] = [];
    let raf = 0;
    let live = true;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(220, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.2,
        a: Math.random() * 0.7 + 0.2,
        s: Math.random() * 0.015 + 0.004,
        p: Math.random() * Math.PI * 2,
      }));
    }

    function starRgb() {
      return (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--star-rgb")
          .trim() || "230, 224, 212"
      );
    }

    function draw(t: number) {
      if (!live || !ctx) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      const rgb = starRgb();
      const theme = document.documentElement.getAttribute("data-theme");
      for (const st of stars) {
        const twinkle = reduce
          ? st.a
          : st.a * (0.55 + 0.45 * Math.sin(t * st.s + st.p));
        const alpha = theme === "khaki" ? twinkle * 0.55 : twinkle;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = window.requestAnimationFrame(draw);
    }

    resize();
    draw(0);
    window.addEventListener("resize", resize);
    const mo = new MutationObserver(() => {
      if (reduce) draw(0);
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mo.disconnect();
    };
  }, []);

  return (
    <div className="guest-landing">
      <canvas ref={canvasRef} className="guest-landing__stars" aria-hidden="true" />
      <div className="guest-landing__nebula" aria-hidden="true" />

      <div className="guest-landing__shell">
        <header className="guest-landing__topbar">
          <div className="guest-landing__brand">
            <span>自宇</span>My Own Cosmos
          </div>
          <nav className="guest-landing__nav" aria-label="模块">
            {MODULE_INTROS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => scrollToModule(m.id)}
              >
                {m.name}
              </button>
            ))}
            <Link href="/guide">说明</Link>
          </nav>
          <div className="guest-landing__actions">
            <ThemeToggle />
            {loggedIn ? (
              <Link href="/app" className="guest-landing__chip guest-landing__chip--accent">
                进入
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="guest-landing__chip"
                  onClick={() => openGate("login")}
                >
                  登录
                </button>
                <button
                  type="button"
                  className="guest-landing__chip guest-landing__chip--accent"
                  onClick={() => openGate("register")}
                >
                  开启
                </button>
              </>
            )}
          </div>
        </header>

        <section className="guest-landing__hero" id="top">
          <div className="guest-landing__hero-copy">
            <p className="guest-landing__eyebrow">TEMPORAL PERSONAL UNIVERSE</p>
            <h1>
              自宇
              <em>My Own Cosmos</em>
            </h1>
            <p className="guest-landing__lede">
              {loggedIn && userName
                ? `你好，${userName}。自宇 V1.0 已就绪：以时序留存过往、安住当下、奔赴未来，并以专注把光阴凝成可回望的轨迹。需要步骤时打开「说明」。`
                : "自宇 V1.0：每个人都拥有一座只属于自己的精神宇宙。留存过往，安住当下，奔赴未来——并以专注，把光阴凝成可回望的轨迹。完整步骤见「说明」。"}
            </p>
            <div className="guest-landing__pills" role="tablist" aria-label="时序维度">
              {ORBIT_PILLS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={focus === p.key}
                  className={`guest-landing__pill ${focus === p.key ? "is-active" : ""}`}
                  onClick={() => selectFocus(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="guest-landing__hint">
              点击维度 · 轨道随之回应 · 下滑进入模块翻阅雅名
            </p>
          </div>

          <div
            className="guest-landing__orbit"
            data-focus={focus}
            aria-hidden="true"
          >
            <div className="guest-landing__ring guest-landing__ring--past" />
            <div className="guest-landing__ring guest-landing__ring--now" />
            <div className="guest-landing__ring guest-landing__ring--future" />
            <div className="guest-landing__core">
              <span>凝时</span>
            </div>
            <span className="guest-landing__ol guest-landing__ol--past">昔时往</span>
            <span className="guest-landing__ol guest-landing__ol--now">今时际</span>
            <span className="guest-landing__ol guest-landing__ol--future">来日途</span>
          </div>
        </section>

        <div className="guest-landing__chapters">
          {MODULE_INTROS.map((m) => (
            <ModuleChapter
              key={m.id}
              moduleId={m.id}
              onActive={onModuleActive}
            />
          ))}
        </div>

        <section className="guest-landing__closing" id="enter" ref={gateRef}>
          <blockquote>
            当下思考，未来规划，专注落地，过往沉淀——再启新生思考。
          </blockquote>
          <cite>自宇 · 时序成长闭环</cite>

          {loggedIn ? (
            <div className="guest-landing__closing-cta">
              <Link href="/app" className="guest-landing__chip guest-landing__chip--accent">
                进入首页
              </Link>
            </div>
          ) : gateMode ? (
            <div className="guest-landing__gate" data-mode={gateMode}>
              <div className="guest-landing__gate-head">
                <div>
                  <p className="guest-landing__gate-eyebrow">
                    {gateMode === "register"
                      ? "BEGIN YOUR COSMOS"
                      : "RETURN TO ORBIT"}
                  </p>
                  <h3>
                    {gateMode === "register"
                      ? "开启属于你的自宇"
                      : "回到你的时序"}
                  </h3>
                  <p className="guest-landing__gate-lede">
                    {gateMode === "register"
                      ? "注册后即可书写流思、规划来日、专注记录专注——一切只属于你。"
                      : "登录后继续你的过往、当下与未来。"}
                  </p>
                </div>
                <button
                  type="button"
                  className="guest-landing__chip"
                  onClick={closeGate}
                >
                  收起
                </button>
              </div>
              <div className="guest-landing__gate-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={gateMode === "login"}
                  className={gateMode === "login" ? "is-active" : ""}
                  onClick={() => openGate("login")}
                >
                  登录
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={gateMode === "register"}
                  className={gateMode === "register" ? "is-active" : ""}
                  onClick={() => openGate("register")}
                >
                  开启
                </button>
              </div>
              {gateMode === "login" ? (
                <LoginForm
                  nextPath="/app"
                  onSwitchRegister={() => openGate("register")}
                />
              ) : (
                <RegisterForm
                  nextPath="/app"
                  onSwitchLogin={() => openGate("login")}
                />
              )}
            </div>
          ) : (
            <div className="guest-landing__closing-cta">
              <button
                type="button"
                className="guest-landing__chip"
                onClick={() => openGate("login")}
              >
                登录
              </button>
              <button
                type="button"
                className="guest-landing__chip guest-landing__chip--accent"
                onClick={() => openGate("register")}
              >
                开启自宇
              </button>
            </div>
          )}
        </section>

        <footer className="guest-landing__footer">
          OWN COSMOS · WEB · ATMOSPHERE
        </footer>
      </div>

      <aside
        className={`guest-landing__panel ${panelOpen ? "is-open" : ""}`}
        aria-live="polite"
      >
        <h3>{getModuleIntro(focus).name}</h3>
        <p>{getModuleIntro(focus).pages[0]?.body ?? getModuleIntro(focus).blurb}</p>
        <button
          type="button"
          className="guest-landing__panel-close"
          onClick={() => setPanelOpen(false)}
        >
          关闭
        </button>
      </aside>
    </div>
  );
}
