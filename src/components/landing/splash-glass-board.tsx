"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { SplashTip } from "@/components/landing/splash-tip";
import { SplashStaticPatterns } from "@/components/landing/splash-static-patterns";
import { SplashNebula } from "@/components/landing/splash-nebula";

type Tool = "pen" | "finger";
type Pt = { x: number; y: number };
type Stroke = Pt[] & { w: number };

type SplashGlassBoardProps = {
  visible: boolean;
  exiting?: boolean;
  onWaterHover?: (clientX: number, clientY: number) => void;
  onWaterTap?: (clientX: number, clientY: number) => void;
  onWaterStir?: (clientX: number, clientY: number, pointerId: number) => void;
  onWaterLift?: (pointerId?: number) => void;
};

const PEN_MIN = 1.4;
const PEN_MAX = 9;
const FIN_MIN = 8;
const FIN_MAX = 44;

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function tracePath(
  ctx: CanvasRenderingContext2D,
  p: Pt[],
  W: number,
  H: number,
) {
  ctx.beginPath();
  if (p.length === 1) {
    ctx.moveTo(p[0].x * W, p[0].y * H);
    ctx.lineTo(p[0].x * W + 0.01, p[0].y * H);
    return;
  }
  ctx.moveTo(p[0].x * W, p[0].y * H);
  if (p.length === 2) {
    ctx.lineTo(p[1].x * W, p[1].y * H);
    return;
  }
  const m0 = mid(p[0], p[1]);
  ctx.lineTo(m0.x * W, m0.y * H);
  for (let i = 1; i < p.length - 1; i++) {
    const m2 = mid(p[i], p[i + 1]);
    ctx.quadraticCurveTo(p[i].x * W, p[i].y * H, m2.x * W, m2.y * H);
  }
  ctx.lineTo(p[p.length - 1].x * W, p[p.length - 1].y * H);
}

/**
 * IB `#gw-slot`：全屏软边玻璃 · 霜雾指擦 · 白墨 · 温度计
 */
export function SplashGlassBoard({
  visible,
  exiting = false,
  onWaterHover,
  onWaterTap,
  onWaterStir,
  onWaterLift,
}: SplashGlassBoardProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const frostRef = useRef<HTMLDivElement>(null);

  const toolRef = useRef<Tool>("finger");
  const fogDRef = useRef(1);
  const sizeRef = useRef({ pen: 3.6, finger: 19 });
  const inkStrokes = useRef<Stroke[]>([]);
  const wipeStrokes = useRef<Stroke[]>([]);
  const curRef = useRef<{ tool: Tool; pts: Stroke } | null>(null);
  const dimRef = useRef({ W: 0, H: 0, dpr: 1 });

  const [tool, setTool] = useState<Tool>("finger");
  const [fogUi, setFogUi] = useState(0.5); // 0 cold..1 warm (inverse of density)
  const [brushUi, setBrushUi] = useState(
    (19 - FIN_MIN) / (FIN_MAX - FIN_MIN),
  );

  function syncFrostOpacity() {
    const t = (fogDRef.current - 0.3) / 2;
    const o = (0.08 + t * 0.72).toFixed(3);
    if (frostRef.current) frostRef.current.style.opacity = o;
  }

  function fa(a: number) {
    return Math.min(1, a * fogDRef.current);
  }

  function paintHaze(fog: CanvasRenderingContext2D, W: number, H: number) {
    fog.globalCompositeOperation = "source-over";
    fog.shadowBlur = 0;
    fog.fillStyle = `rgba(208,224,244,${fa(0.025)})`;
    fog.fillRect(0, 0, W, H);
    const g = fog.createRadialGradient(
      W * 0.5,
      H * 0.46,
      Math.min(W, H) * 0.22,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.72,
    );
    g.addColorStop(0, "rgba(214,228,246,0)");
    g.addColorStop(1, `rgba(214,228,246,${fa(0.035)})`);
    fog.fillStyle = g;
    fog.fillRect(0, 0, W, H);

    function blotch(x: number, y: number, r: number, a: number) {
      const bg = fog.createRadialGradient(
        W * x,
        H * y,
        0,
        W * x,
        H * y,
        Math.max(W, H) * r,
      );
      bg.addColorStop(0, `rgba(222,234,250,${a})`);
      bg.addColorStop(1, "rgba(222,234,250,0)");
      fog.fillStyle = bg;
      fog.fillRect(0, 0, W, H);
    }
    blotch(0.18, 0.2, 0.5, fa(0.018));
    blotch(0.82, 0.74, 0.55, fa(0.015));
    blotch(0.6, 0.12, 0.4, fa(0.012));
  }

  function renderWipeStroke(
    fog: CanvasRenderingContext2D,
    p: Stroke,
    W: number,
    H: number,
  ) {
    const w = p.w || 19;
    fog.globalCompositeOperation = "destination-out";
    fog.lineCap = "round";
    fog.lineJoin = "round";
    fog.strokeStyle = "rgba(0,0,0,0.92)";
    fog.lineWidth = w;
    if (p.length === 1) {
      fog.fillStyle = "rgba(0,0,0,0.92)";
      fog.beginPath();
      fog.arc(p[0].x * W, p[0].y * H, w / 2, 0, Math.PI * 2);
      fog.fill();
    }
    for (let i = 1; i < p.length; i++) {
      fog.beginPath();
      fog.moveTo(p[i - 1].x * W, p[i - 1].y * H);
      fog.lineTo(p[i].x * W, p[i].y * H);
      fog.stroke();
    }
    fog.globalCompositeOperation = "source-over";
  }

  function redrawFog() {
    const fogCv = fogRef.current;
    if (!fogCv) return;
    const fog = fogCv.getContext("2d");
    if (!fog) return;
    const { W, H } = dimRef.current;
    if (W < 2) return;
    fog.globalCompositeOperation = "source-over";
    fog.clearRect(0, 0, W, H);
    paintHaze(fog, W, H);
    for (const s of wipeStrokes.current) renderWipeStroke(fog, s, W, H);
  }

  function inkStyle(ink: CanvasRenderingContext2D, w: number) {
    ink.lineCap = "round";
    ink.lineJoin = "round";
    ink.strokeStyle = "rgba(255,255,255,0.78)";
    ink.fillStyle = "rgba(255,255,255,0.78)";
    ink.lineWidth = w;
    ink.shadowColor = "rgba(178,212,255,0.9)";
    ink.shadowBlur = 12;
  }

  function renderInkStroke(
    ink: CanvasRenderingContext2D,
    p: Stroke,
    W: number,
    H: number,
  ) {
    const w = p.w || 3.6;
    if (p.length === 1) {
      inkStyle(ink, w);
      ink.beginPath();
      ink.arc(p[0].x * W, p[0].y * H, w * 0.53, 0, Math.PI * 2);
      ink.fill();
      return;
    }
    inkStyle(ink, w);
    tracePath(ink, p, W, H);
    ink.stroke();
  }

  function redrawInk() {
    const inkCv = inkRef.current;
    if (!inkCv) return;
    const ink = inkCv.getContext("2d");
    if (!ink) return;
    const { W, H } = dimRef.current;
    if (W < 2) return;
    ink.clearRect(0, 0, W, H);
    for (const s of inkStrokes.current) renderInkStroke(ink, s, W, H);
  }

  function sizeAll() {
    const pane = paneRef.current;
    const fogCv = fogRef.current;
    const inkCv = inkRef.current;
    if (!pane || !fogCv || !inkCv) return;
    const r = pane.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = r.width;
    const H = r.height;
    dimRef.current = { W, H, dpr };
    fogCv.width = Math.round(W * dpr);
    fogCv.height = Math.round(H * dpr);
    inkCv.width = Math.round(W * dpr);
    inkCv.height = Math.round(H * dpr);
    fogCv.style.width = `${W}px`;
    fogCv.style.height = `${H}px`;
    inkCv.style.width = `${W}px`;
    inkCv.style.height = `${H}px`;
    const fog = fogCv.getContext("2d");
    const ink = inkCv.getContext("2d");
    fog?.setTransform(dpr, 0, 0, dpr, 0, 0);
    ink?.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawInk();
    redrawFog();
  }

  function selectTool(next: Tool) {
    toolRef.current = next;
    setTool(next);
    const s = sizeRef.current;
    if (next === "pen") {
      setBrushUi((s.pen - PEN_MIN) / (PEN_MAX - PEN_MIN));
    } else {
      setBrushUi((s.finger - FIN_MIN) / (FIN_MAX - FIN_MIN));
    }
  }

  function setFogFromUi(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setFogUi(clamped);
    fogDRef.current = 0.3 + (1 - clamped) * 2;
    syncFrostOpacity();
    redrawFog();
  }

  function setBrushFromUi(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setBrushUi(clamped);
    if (toolRef.current === "pen") {
      sizeRef.current.pen = PEN_MIN + clamped * (PEN_MAX - PEN_MIN);
    } else {
      sizeRef.current.finger = FIN_MIN + clamped * (FIN_MAX - FIN_MIN);
    }
  }

  function clearBoard() {
    inkStrokes.current = [];
    wipeStrokes.current = [];
    curRef.current = null;
    redrawInk();
    redrawFog();
  }

  function pt(e: ReactPointerEvent<HTMLCanvasElement>): Pt {
    const { W, H } = dimRef.current;
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / W,
      y: (e.clientY - r.top) / H,
    };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (e.button > 0 || exiting || !visible) return;
    const { W } = dimRef.current;
    if (W < 2) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    onWaterTap?.(e.clientX, e.clientY);
    onWaterStir?.(e.clientX, e.clientY, e.pointerId);
    const p = pt(e);
    const stroke = [p] as Stroke;
    stroke.w = sizeRef.current[toolRef.current];
    curRef.current = { tool: toolRef.current, pts: stroke };
    if (toolRef.current === "pen") {
      inkStrokes.current.push(stroke);
      redrawInk();
    } else {
      wipeStrokes.current.push(stroke);
      const fog = fogRef.current?.getContext("2d");
      if (fog) renderWipeStroke(fog, stroke, dimRef.current.W, dimRef.current.H);
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    onWaterHover?.(e.clientX, e.clientY);
    const cur = curRef.current;
    if (!cur) return;
    onWaterStir?.(e.clientX, e.clientY, e.pointerId);
    const p = pt(e);
    const pts = cur.pts;
    const last = pts[pts.length - 1];
    const { W, H } = dimRef.current;
    if (Math.hypot((p.x - last.x) * W, (p.y - last.y) * H) < 1.2) return;
    pts.push(p);
    if (cur.tool === "pen") {
      redrawInk();
    } else {
      const fog = fogRef.current?.getContext("2d");
      if (!fog) return;
      fog.globalCompositeOperation = "destination-out";
      fog.lineCap = "round";
      fog.lineJoin = "round";
      fog.strokeStyle = "rgba(0,0,0,0.92)";
      fog.lineWidth = pts.w || 19;
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      fog.beginPath();
      fog.moveTo(a.x * W, a.y * H);
      fog.lineTo(b.x * W, b.y * H);
      fog.stroke();
      fog.globalCompositeOperation = "source-over";
    }
    e.preventDefault();
  }

  function onPointerUp(e?: ReactPointerEvent<HTMLCanvasElement>) {
    if (e) onWaterLift?.(e.pointerId);
    else onWaterLift?.();
    if (!curRef.current) return;
    if (curRef.current.tool === "finger") redrawFog();
    curRef.current = null;
  }

  useEffect(() => {
    syncFrostOpacity();
    sizeAll();
    const pane = paneRef.current;
    if (!pane) return;
    const ro = new ResizeObserver(() => sizeAll());
    ro.observe(pane);
    window.addEventListener("resize", sizeAll);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sizeAll);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => sizeAll());
    }
  }, [visible]);

  const mistLabel = (() => {
    const t = Math.round(-13 + 20 * fogUi);
    return `${t === 0 ? 0 : t}°`;
  })();
  const brushLabel = `${Math.round(-13 + 20 * brushUi)}°F`;

  return (
    <div
      className={`guest-glass${visible ? "" : " is-off"}${
        exiting ? " is-exit" : ""
      }`}
      aria-hidden={!visible}
    >
        <div ref={paneRef} className="guest-glass__pane">
          <div className="guest-glass__grade" aria-hidden="true" />
          <div ref={frostRef} className="guest-glass__frost" aria-hidden="true" />
          <div className="guest-glass__noise" aria-hidden="true" />
          <div className="guest-glass__depth" aria-hidden="true" />
          <canvas ref={fogRef} className="guest-glass__fog" aria-hidden="true" />
          <SplashNebula />
          <SplashStaticPatterns />
          <canvas
            ref={inkRef}
            className="guest-glass__ink"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        <div className="guest-glass__ctrl">
          <SplashTip tip="笔迹">
            <button
              type="button"
              className={`guest-glass__cbtn${tool === "pen" ? " is-active" : ""}`}
              aria-label="笔迹"
              onClick={() => selectTool("pen")}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </SplashTip>
          <SplashTip tip="指尖擦雾">
            <button
              type="button"
              className={`guest-glass__cbtn${
                tool === "finger" ? " is-active" : ""
              }`}
              aria-label="指尖擦雾"
              onClick={() => selectTool("finger")}
            >
              <svg viewBox="0 0 24 24">
                <path d="M2 12a10 10 0 0 1 18-6" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
              </svg>
            </button>
          </SplashTip>
          <SplashTip tip="清空画板">
            <button
              type="button"
              className="guest-glass__cbtn"
              aria-label="清空画板"
              onClick={clearBoard}
            >
              <svg viewBox="0 0 24 24">
                <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
                <path d="M22 21H7" />
                <path d="m5 11 9 9" />
              </svg>
            </button>
          </SplashTip>
        </div>

        <div className="guest-glass__therms">
          <SplashTip tip="雾气温度：越暖雾越淡" className="guest-glass__therm-wrap">
            <Therm
              label="MIST"
              value={fogUi}
              display={mistLabel}
              onChange={setFogFromUi}
            />
          </SplashTip>
          <SplashTip tip="笔触大小（当前工具）" className="guest-glass__therm-wrap">
            <Therm
              label="BRUSH"
              value={brushUi}
              display={brushLabel}
              onChange={setBrushFromUi}
            />
          </SplashTip>
        </div>
    </div>
  );
}

function Therm({
  label,
  value,
  display,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const tubeRef = useRef<HTMLDivElement>(null);
  const drag = useRef(false);

  function fromX(clientX: number) {
    const tube = tubeRef.current;
    if (!tube) return;
    const r = tube.getBoundingClientRect();
    if (r.width < 2) return;
    onChange(Math.max(0, Math.min(1, (clientX - r.left) / r.width)));
  }

  return (
    <div
      className="guest-glass__therm"
      role="slider"
      aria-label={label}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => {
        if (e.button > 0) return;
        drag.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        fromX(e.clientX);
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        fromX(e.clientX);
        e.preventDefault();
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
      onWheel={(e) => {
        onChange(Math.max(0, Math.min(1, value + (e.deltaY < 0 ? 0.05 : -0.05))));
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span className="guest-glass__therm-label">{label}</span>
      <div className="guest-glass__therm-body">
        <span
          className="guest-glass__therm-bulb"
          style={{ opacity: 0.55 + value * 0.45 }}
        />
        <div ref={tubeRef} className="guest-glass__therm-tube">
          <div
            className="guest-glass__therm-fill"
            style={{ width: `${(value * 100).toFixed(1)}%` }}
          />
        </div>
      </div>
      <span className="guest-glass__therm-val">{display}</span>
    </div>
  );
}
