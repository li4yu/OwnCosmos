"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { SplashGlassBoard } from "@/components/landing/splash-glass-board";
import { SplashStaticPatterns } from "@/components/landing/splash-static-patterns";
import { SplashNebula } from "@/components/landing/splash-nebula";
import { SplashTip } from "@/components/landing/splash-tip";
import {
  SplashWaterRipple,
  type SplashWaterRippleHandle,
} from "@/components/landing/splash-water-ripple";

type GateMode = "login" | "register";

type GuestAtmosphereLandingProps = {
  loggedIn?: boolean;
  userName?: string | null;
};

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  s: number;
  p: number;
};

type Drift = {
  x: number;
  y: number;
  r: number;
  a: number;
  vx: number;
  vy: number;
};

type Ripple = { id: number; x: number; y: number };

/**
 * 访客欢迎页：对标 Internal Beyond Splash
 * — 霜雾光标驱散 / 视差 / 涟漪 / 按钮磁吸与按压
 */
export function GuestAtmosphereLanding({
  loggedIn = false,
  userName,
}: GuestAtmosphereLandingProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef<SplashWaterRippleHandle>(null);
  const spotRef = useRef({ x: 0.72, y: 0.28, tx: 0.72, ty: 0.28 });
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

  const [gateMode, setGateMode] = useState<GateMode | null>(paramMode);
  const [entering, setEntering] = useState(false);
  const [brandMode, setBrandMode] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);
  const [ready, setReady] = useState(false);
  const [glassOn, setGlassOn] = useState(true);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleId = useRef(0);

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
  }

  function closeGate() {
    setGateMode(null);
    syncAuthUrl(null);
  }

  /** IB enterSite：先 Loading，再 dissolve，再跳转 */
  function enterTo(path: string) {
    if (entering) return;
    setGateMode(null);
    syncAuthUrl(null);
    setEntering(true);
    setLoadingHint(true);
    window.setTimeout(() => {
      router.push(path);
    }, 1700);
  }

  function enterApp() {
    enterTo("/app");
  }

  function enterGuide() {
    enterTo("/guide");
  }

  function explore() {
    if (loggedIn) enterApp();
    else openGate("login");
  }

  function onRootPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = rootRef.current;
    if (!el || entering) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    spotRef.current.tx = Math.min(1, Math.max(0, nx));
    spotRef.current.ty = Math.min(1, Math.max(0, ny));
    waterRef.current?.hover(e.clientX, e.clientY);
    if (e.buttons & 1) {
      waterRef.current?.stir(e.clientX, e.clientY, e.pointerId);
    }
  }

  function onRootPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (entering || gateMode) return;
    const el = rootRef.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "button, a, input, textarea, label, .guest-landing__gate, .guest-glass__ctrl, .guest-glass__therms",
      )
    ) {
      return;
    }
    waterRef.current?.tap(e.clientX, e.clientY);
    waterRef.current?.stir(e.clientX, e.clientY, e.pointerId);
    const rect = el.getBoundingClientRect();
    const id = ++rippleId.current;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((prev) => [...prev.slice(-4), { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 1100);
  }

  function onRootPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    waterRef.current?.lift(e.pointerId);
  }

  function magnetize(e: ReactPointerEvent<HTMLButtonElement | HTMLAnchorElement>) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
    const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
    btn.style.setProperty("--mx", `${dx * 6}px`);
    btn.style.setProperty("--my", `${dy * 4}px`);
  }

  function demagnetize(e: ReactPointerEvent<HTMLButtonElement | HTMLAnchorElement>) {
    e.currentTarget.style.setProperty("--mx", "0px");
    e.currentTarget.style.setProperty("--my", "0px");
  }

  useEffect(() => {
    if (!paramMode) return;
    setGateMode(paramMode);
  }, [paramMode]);

  useEffect(() => {
    if (!gateMode) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") closeGate();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gateMode]);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  /* Smooth spotlight follow (IB frost-wipe feel) — write CSS vars, no React re-render */
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--spot-x", "72%");
    el.style.setProperty("--spot-y", "28%");
    el.style.setProperty("--px", "0.44");
    el.style.setProperty("--py", "-0.44");
    if (reduce) return;
    let raf = 0;
    let live = true;
    function tick() {
      if (!live || !rootRef.current) return;
      const s = spotRef.current;
      s.x += (s.tx - s.x) * 0.12;
      s.y += (s.ty - s.y) * 0.12;
      const node = rootRef.current;
      node.style.setProperty("--spot-x", `${(s.x * 100).toFixed(2)}%`);
      node.style.setProperty("--spot-y", `${(s.y * 100).toFixed(2)}%`);
      node.style.setProperty("--px", ((s.x - 0.5) * 2).toFixed(3));
      node.style.setProperty("--py", ((s.y - 0.5) * 2).toFixed(3));
      raf = window.requestAnimationFrame(tick);
    }
    raf = window.requestAnimationFrame(tick);
    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: Star[] = [];
    let drifts: Drift[] = [];
    let raf = 0;
    let live = true;
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starCount = Math.min(420, Math.floor((w * h) / 4200));
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + 0.35,
        a: Math.random() * 0.55 + 0.35,
        s: Math.random() * 0.0022 + 0.0008,
        p: Math.random() * Math.PI * 2,
      }));

      drifts = Array.from({ length: 18 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 90 + 40,
        a: Math.random() * 0.06 + 0.03,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.08,
      }));
    }

    function starRgb() {
      return "210, 225, 250";
    }

    function mistRgb() {
      return "150, 185, 235";
    }

    function draw(t: number) {
      if (!live || !ctx) return;
      ctx.clearRect(0, 0, w, h);
      const rgb = starRgb();
      const mist = mistRgb();

      for (const d of drifts) {
        if (!reduce) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < -d.r) d.x = w + d.r;
          if (d.x > w + d.r) d.x = -d.r;
          if (d.y < -d.r) d.y = h + d.r;
          if (d.y > h + d.r) d.y = -d.r;
        }
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        g.addColorStop(0, `rgba(${mist}, ${d.a})`);
        g.addColorStop(1, `rgba(${mist}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const st of stars) {
        const twinkle = reduce
          ? st.a
          : st.a * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * st.s * 60 + st.p)));
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${twinkle})`;
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
        if (st.r > 1.4) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(${rgb}, ${twinkle * 0.22})`;
          ctx.arc(st.x, st.y, st.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!reduce) raf = window.requestAnimationFrame(draw);
    }

    resize();
    draw(performance.now());
    window.addEventListener("resize", resize);

    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`guest-landing${ready ? " is-ready" : ""}${
        entering ? " is-entering" : ""
      }${gateMode ? " is-gated" : ""}`}
      onPointerMove={onRootPointerMove}
      onPointerDown={onRootPointerDown}
      onPointerUp={onRootPointerUp}
      onPointerCancel={onRootPointerUp}
    >
      <div className="guest-landing__sky" aria-hidden="true" />
      <div className="guest-landing__haze guest-landing__haze--a" aria-hidden="true" />
      <div className="guest-landing__haze guest-landing__haze--b" aria-hidden="true" />
      <div className="guest-landing__haze guest-landing__haze--c" aria-hidden="true" />

      {/* 时序环 + 星座线 + 菱形纹：补画面层次 */}
      <div className="guest-landing__orbits" aria-hidden="true">
        <span className="guest-landing__orbit guest-landing__orbit--a" />
        <span className="guest-landing__orbit guest-landing__orbit--b" />
        <span className="guest-landing__orbit guest-landing__orbit--c" />
      </div>
      <svg
        className="guest-landing__constellation"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g
          fill="none"
          stroke="rgba(186,210,245,0.22)"
          strokeWidth="0.15"
          vectorEffect="non-scaling-stroke"
        >
          <path d="M12 28 L22 18 L34 24 L40 14 L52 20" />
          <path d="M58 72 L68 62 L78 70 L88 58" />
          <path d="M18 68 L28 58 L36 66 L48 54" />
        </g>
        <g fill="rgba(220,234,255,0.55)">
          <circle cx="12" cy="28" r="0.35" />
          <circle cx="22" cy="18" r="0.45" />
          <circle cx="34" cy="24" r="0.3" />
          <circle cx="40" cy="14" r="0.5" />
          <circle cx="52" cy="20" r="0.35" />
          <circle cx="58" cy="72" r="0.4" />
          <circle cx="68" cy="62" r="0.3" />
          <circle cx="78" cy="70" r="0.45" />
          <circle cx="88" cy="58" r="0.35" />
          <circle cx="18" cy="68" r="0.3" />
          <circle cx="28" cy="58" r="0.4" />
          <circle cx="36" cy="66" r="0.28" />
          <circle cx="48" cy="54" r="0.38" />
        </g>
      </svg>
      <div className="guest-landing__motifs" aria-hidden="true">
        <span className="guest-landing__diamond guest-landing__diamond--a" />
        <span className="guest-landing__diamond guest-landing__diamond--b" />
        <span className="guest-landing__diamond guest-landing__diamond--c" />
        <span className="guest-landing__meridian" />
      </div>
      {/* 玻璃关闭时仍显示静态纹样；开启时画板内另有一层 */}
      {!glassOn ? <SplashStaticPatterns /> : null}

      <canvas
        ref={canvasRef}
        className="guest-landing__stars"
        aria-hidden="true"
      />
      <SplashWaterRipple
        ref={waterRef}
        active={!entering}
        className="guest-water"
      />
      <div className="guest-landing__veil" aria-hidden="true" />
      <div className="guest-landing__frost" aria-hidden="true" />
      {/* 星云放在霜层之上、玻璃之下，避免被模糊罩死 */}
      <SplashNebula />
      <div className="guest-landing__beam" aria-hidden="true" />
      <div className="guest-landing__spot" aria-hidden="true" />

      <SplashGlassBoard
        visible={glassOn && !gateMode}
        exiting={entering}
        onWaterTap={(x, y) => waterRef.current?.tap(x, y)}
        onWaterStir={(x, y, id) => waterRef.current?.stir(x, y, id)}
        onWaterHover={(x, y) => waterRef.current?.hover(x, y)}
        onWaterLift={(id) => waterRef.current?.lift(id)}
      />

      {ripples.map((r) => (
        <span
          key={r.id}
          className="guest-landing__ripple"
          style={{ left: r.x, top: r.y }}
          aria-hidden="true"
        />
      ))}

      <header className="guest-landing__topbar">
        <span className="guest-landing__brand">
          <span>自宇</span>My Own Cosmos
        </span>
        <div className="guest-landing__actions">
          {loggedIn ? (
            <SplashTip tip="进入你的首页">
              <button
                type="button"
                className="guest-landing__chip guest-landing__chip--accent"
                onClick={enterApp}
              >
                进入
              </button>
            </SplashTip>
          ) : (
            <>
              <SplashTip tip="登录已有账号">
                <button
                  type="button"
                  className="guest-landing__chip"
                  onClick={() => openGate("login")}
                >
                  登录
                </button>
              </SplashTip>
              <SplashTip tip="注册并开启属于你的自宇">
                <button
                  type="button"
                  className="guest-landing__chip guest-landing__chip--accent"
                  onClick={() => openGate("register")}
                >
                  开启
                </button>
              </SplashTip>
            </>
          )}
        </div>
      </header>

      <section className="guest-landing__splash" aria-label="欢迎">
        <div
          className={`guest-landing__copy${
            gateMode || loadingHint ? " is-dimmed" : ""
          }`}
        >
          <p className="guest-landing__sign">
            <SplashTip tip="切换品牌排版（再点可返回）">
              <button
                type="button"
                className="guest-landing__sign-toggle"
                onClick={() => setBrandMode((v) => !v)}
                aria-pressed={brandMode}
              >
                Own Cosmos
              </button>
            </SplashTip>
            <SplashTip tip={glassOn ? "收起玻璃画板" : "打开玻璃画板"}>
              <button
                type="button"
                className={`guest-glass-toggle${glassOn ? "" : " is-off"}`}
                aria-pressed={glassOn}
                onClick={() => setGlassOn((v) => !v)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
                  <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
                  <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
                  <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
                  <path
                    d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </SplashTip>
          </p>
          <div className="guest-landing__rule" aria-hidden="true" />

          <div
            className={`guest-landing__swap${brandMode ? " is-brand" : ""}`}
          >
            <div className="guest-landing__pane guest-landing__pane--welcome">
              <p className="guest-landing__title">
                Welcome to{" "}
                <span className="guest-landing__hl">自</span>宇
              </p>
              <p className="guest-landing__desc">
                {loggedIn && userName ? (
                  <>
                    你好，{userName}。这是一座
                    <span className="guest-landing__white">只属于你</span>
                    的时序宇宙。
                  </>
                ) : (
                  <>
                    这是一座
                    <span className="guest-landing__white">只属于你</span>
                    的精神宇宙。
                  </>
                )}
              </p>
              <p className="guest-landing__desc2">
                留存过往，安住当下，奔赴未来——
                <br />
                并以专注，把光阴凝成可回望的轨迹。
              </p>
              <p className="guest-landing__note">
                滑过水面会起涟漪；右侧全屏可擦雾落笔。数据按账号隔离。
              </p>
            </div>

            <div className="guest-landing__pane guest-landing__pane--brand">
              <p className="guest-landing__brand-sub">
                A place of waking in the mist.
                <br />
                All moments are kept here, waiting to be read.
              </p>
              <h1 className="guest-landing__brand-title">
                <span className="guest-landing__brand-zh">自宇</span>
                <span className="guest-landing__brand-rule" aria-hidden="true" />
                <span className="guest-landing__brand-en">My Own Cosmos</span>
              </h1>
            </div>
          </div>

          <div className="guest-landing__buttons">
            {loggedIn ? (
              <>
                <SplashTip tip="进入首页总览">
                  <button
                    type="button"
                    className="guest-landing__btn guest-landing__btn--accent"
                    onPointerMove={magnetize}
                    onPointerLeave={demagnetize}
                    onClick={enterApp}
                  >
                    进入首页
                  </button>
                </SplashTip>
                <SplashTip tip="查看使用说明">
                  <button
                    type="button"
                    className="guest-landing__btn"
                    onPointerMove={magnetize}
                    onPointerLeave={demagnetize}
                    onClick={enterGuide}
                  >
                    查看说明
                  </button>
                </SplashTip>
              </>
            ) : (
              <>
                <SplashTip tip="注册新账号，开启自宇">
                  <button
                    type="button"
                    className="guest-landing__btn guest-landing__btn--accent"
                    onPointerMove={magnetize}
                    onPointerLeave={demagnetize}
                    onClick={() => openGate("register")}
                  >
                    开启自宇
                  </button>
                </SplashTip>
                <SplashTip tip="登录已有账号">
                  <button
                    type="button"
                    className="guest-landing__btn"
                    onPointerMove={magnetize}
                    onPointerLeave={demagnetize}
                    onClick={() => openGate("login")}
                  >
                    登录
                  </button>
                </SplashTip>
                <SplashTip tip="先看看功能说明">
                  <button
                    type="button"
                    className="guest-landing__btn"
                    onPointerMove={magnetize}
                    onPointerLeave={demagnetize}
                    onClick={enterGuide}
                  >
                    查看说明
                  </button>
                </SplashTip>
              </>
            )}
          </div>
          <SplashTip tip={loggedIn ? "直接进入首页" : "打开登录"}>
            <button
              type="button"
              className="guest-landing__skip"
              onClick={explore}
            >
              跳过，直接探索 →
            </button>
          </SplashTip>
        </div>

        <p className="guest-landing__hint" aria-hidden="true">
          glide to wake the water
        </p>

        {loadingHint ? (
          <div className="guest-landing__loading" aria-live="polite">
            <p>Now Loading…</p>
          </div>
        ) : null}

        {gateMode ? (
          <div
            className="guest-landing__gate-layer"
            role="dialog"
            aria-modal="true"
            aria-label={gateMode === "register" ? "注册" : "登录"}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="guest-landing__gate-scrim"
              aria-label="关闭"
              onClick={closeGate}
            />
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
                      ? "注册后即可书写随笔、规划来日、开启专注——一切只属于你。"
                      : "登录后继续你的过往、当下与未来。"}
                  </p>
                </div>
                <SplashTip tip="关闭登录窗口">
                  <button
                    type="button"
                    className="guest-landing__chip"
                    onClick={closeGate}
                  >
                    收起
                  </button>
                </SplashTip>
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
          </div>
        ) : null}
      </section>
    </div>
  );
}
