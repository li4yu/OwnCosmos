"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

export type SplashWaterRippleHandle = {
  /** 轻触滑过（无需按住） */
  hover: (clientX: number, clientY: number) => void;
  /** 点击 / 落笔 */
  tap: (clientX: number, clientY: number) => void;
  /** 按住拖动 */
  stir: (clientX: number, clientY: number, pointerId: number) => void;
  lift: (pointerId?: number) => void;
};

type SplashWaterRippleProps = {
  active?: boolean;
  className?: string;
};

/**
 * Internal Beyond 式水波：降采样高度场 + 高光渲染。
 * 滑过即可起涟漪；偶发雨点与环境扰动。
 */
export const SplashWaterRipple = forwardRef<
  SplashWaterRippleHandle,
  SplashWaterRippleProps
>(function SplashWaterRipple({ active = true, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef({
    hover: (_x: number, _y: number) => {},
    tap: (_x: number, _y: number) => {},
    stir: (_x: number, _y: number, _id: number) => {},
    lift: (_id?: number) => {},
  });

  useImperativeHandle(ref, () => ({
    hover: (x, y) => apiRef.current.hover(x, y),
    tap: (x, y) => apiRef.current.tap(x, y),
    stir: (x, y, id) => apiRef.current.stir(x, y, id),
    lift: (id) => apiRef.current.lift(id),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !active) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let live = true;
    let raf = 0;
    let W = 0;
    let H = 0;
    let SW = 0;
    let SH = 0;
    let h1 = new Float32Array(0);
    let h2 = new Float32Array(0);
    let outImg: ImageData | null = null;
    const sim = document.createElement("canvas");
    let simCtx = sim.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const DAMP = 0.9855;
    const GAIN = 280;
    const CAP = 150;
    let swT = 0;
    let last = performance.now();
    let rainT = 0.8 + Math.random();
    let ambT = 2 + Math.random() * 2;
    const stirPts: Record<number, { x: number; y: number }> = {};
    let hoverLast = { x: -1, y: -1, t: 0 };

    type Drop = {
      x: number;
      y: number;
      ty: number;
      sx: number;
      sy: number;
      str: number;
      v: number;
      vx: number;
      w: number;
    };
    type Plip = { x: number; y: number; t: number };
    const drops: Drop[] = [];
    const plips: Plip[] = [];

    function R(a: number, b: number) {
      return a + Math.random() * (b - a);
    }

    function poke(cx: number, cy: number, str: number, rad: number) {
      cx |= 0;
      cy |= 0;
      const r2 = rad * rad;
      const R0 = Math.ceil(rad);
      for (let y = -R0; y <= R0; y++) {
        for (let x = -R0; x <= R0; x++) {
          const px = cx + x;
          const py = cy + y;
          if (px < 1 || py < 1 || px >= SW - 1 || py >= SH - 1) continue;
          const f = (x * x + y * y) / r2;
          if (f > 1) continue;
          h1[py * SW + px] += str * (0.5 + 0.5 * Math.cos(Math.PI * Math.sqrt(f)));
        }
      }
    }

    function toSim(clientX: number, clientY: number) {
      const r = canvas!.getBoundingClientRect();
      if (r.width < 2) return null;
      return {
        x: ((clientX - r.left) / r.width) * SW,
        y: ((clientY - r.top) / r.height) * SH,
      };
    }

    function gridFit() {
      SW = Math.min(300, Math.max(140, Math.round(W / 4.2)));
      SH = Math.max(80, Math.round((SW * H) / W));
      sim.width = SW;
      sim.height = SH;
      simCtx = sim.getContext("2d");
      h1 = new Float32Array(SW * SH);
      h2 = new Float32Array(SW * SH);
      outImg = simCtx!.createImageData(SW, SH);
      drops.length = 0;
      plips.length = 0;
      for (const k of Object.keys(stirPts)) delete stirPts[Number(k)];
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = Math.floor(W * dpr);
      canvas!.height = Math.floor(H * dpr);
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridFit();
    }

    function stepWater() {
      swT += 0.0333;
      for (let y = 1; y < SH - 1; y++) {
        let i = y * SW + 1;
        for (let x = 1; x < SW - 1; x++, i++) {
          h2[i] =
            ((h1[i - 1] + h1[i + 1] + h1[i - SW] + h1[i + SW]) * 0.5 - h2[i]) *
              DAMP +
            0.0022 * Math.sin(swT * 0.7 + x * 0.05 + y * 0.021) +
            0.0017 * Math.sin(swT * 0.43 - x * 0.023 + y * 0.041);
        }
      }
      const t = h1;
      h1 = h2;
      h2 = t;
    }

    function renderWater() {
      if (!outImg || !simCtx) return;
      const dst = outImg.data;
      const h = h1;
      for (let y = 0; y < SH; y++) {
        const yu = y > 0 ? y - 1 : y;
        const yd = y < SH - 1 ? y + 1 : y;
        for (let x = 0; x < SW; x++) {
          const i = y * SW + x;
          const xl = x > 0 ? i - 1 : i;
          const xr = x < SW - 1 ? i + 1 : i;
          const gy = h[yu * SW + x] - h[yd * SW + x];
          const di = i * 4;
          let a = gy * GAIN;
          if (a >= 0) {
            dst[di] = 224;
            dst[di + 1] = 238;
            dst[di + 2] = 255;
            dst[di + 3] = a > CAP ? CAP : a | 0;
          } else {
            a = -a;
            dst[di] = 10;
            dst[di + 1] = 22;
            dst[di + 2] = 44;
            dst[di + 3] = a > CAP ? CAP : a | 0;
          }
        }
      }
      simCtx.putImageData(outImg, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      ctx!.imageSmoothingEnabled = true;
      ctx!.globalCompositeOperation = "screen";
      ctx!.drawImage(sim, 0, 0, W, H);
      ctx!.globalCompositeOperation = "source-over";
    }

    function spawnDrop(str: number) {
      const sx = R(2, SW - 2);
      const sy = R(2, SH - 2);
      const px = (sx / SW) * W;
      const py = (sy / SH) * H;
      const fall = H * R(0.28, 0.48);
      const dur = R(0.28, 0.4);
      const vx = R(-8, 14);
      drops.push({
        x: px - vx * dur,
        y: py - fall,
        ty: py,
        sx,
        sy,
        str,
        v: fall / dur,
        vx,
        w: 1 + str * 0.35,
      });
    }

    function updateDrops(dt: number) {
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.x += d.vx * dt;
        d.y += d.v * dt;
        if (d.y >= d.ty) {
          poke(d.sx, d.sy, d.str * 1.15, 1.6);
          poke(d.sx, d.sy, -d.str * 0.4, 3.2);
          plips.push({ x: d.x, y: d.ty, t: 0.22 });
          drops.splice(i, 1);
          continue;
        }
        const len = Math.min(26, d.v * 0.045);
        const tx = d.x - d.vx * (len / d.v);
        const ty = d.y - len;
        const g = ctx!.createLinearGradient(tx, ty, d.x, d.y);
        g.addColorStop(0, "rgba(214,229,248,0)");
        g.addColorStop(0.7, "rgba(206,223,246,0.4)");
        g.addColorStop(1, "rgba(232,243,255,0.78)");
        ctx!.strokeStyle = g;
        ctx!.lineWidth = d.w;
        ctx!.lineCap = "round";
        ctx!.beginPath();
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(d.x, d.y);
        ctx!.stroke();
      }
      for (let j = plips.length - 1; j >= 0; j--) {
        const p = plips[j];
        p.t -= dt;
        if (p.t <= 0) {
          plips.splice(j, 1);
          continue;
        }
        const a = p.t / 0.22;
        ctx!.strokeStyle = `rgba(228,241,255,${(0.45 * a).toFixed(3)})`;
        ctx!.lineWidth = 0.9;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1.2 + (1 - a) * 5, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function rhythm(dt: number) {
      rainT -= dt;
      if (rainT <= 0) {
        rainT = R(1.1, 2.6);
        spawnDrop(R(0.7, 1.35));
        if (Math.random() < 0.16) spawnDrop(R(0.45, 0.85));
      }
      ambT -= dt;
      if (ambT <= 0) {
        ambT = R(2.8, 5.8);
        poke(R(2, SW - 2), R(2, SH - 2), R(0.22, 0.5), 3);
      }
    }

    apiRef.current = {
      hover(clientX, clientY) {
        const p = toSim(clientX, clientY);
        if (!p || SW < 2) return;
        const now = performance.now();
        const dx = p.x - hoverLast.x;
        const dy = p.y - hoverLast.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1.4 && now - hoverLast.t < 32) return;
        const s = Math.min(0.28, 0.06 + dist * 0.035);
        poke(p.x, p.y, s, 1.8);
        hoverLast = { x: p.x, y: p.y, t: now };
      },
      tap(clientX, clientY) {
        const p = toSim(clientX, clientY);
        if (!p) return;
        poke(p.x, p.y, 0.85, 2.2);
        poke(p.x, p.y, -0.28, 4);
      },
      stir(clientX, clientY, pointerId) {
        const p = toSim(clientX, clientY);
        if (!p) return;
        const lp = stirPts[pointerId];
        if (!lp) {
          stirPts[pointerId] = { x: p.x, y: p.y };
          return;
        }
        const dx = p.x - lp.x;
        const dy = p.y - lp.y;
        const d = Math.hypot(dx, dy);
        if (d < 1.1) return;
        const steps = Math.min(6, Math.ceil(d / 1.5));
        const s = Math.min(0.55, 0.12 + d * 0.05);
        for (let i = 1; i <= steps; i++) {
          poke(lp.x + (dx * i) / steps, lp.y + (dy * i) / steps, s, 1.7);
        }
        lp.x = p.x;
        lp.y = p.y;
      },
      lift(pointerId) {
        if (pointerId == null) {
          for (const k of Object.keys(stirPts)) delete stirPts[Number(k)];
          return;
        }
        delete stirPts[pointerId];
      },
    };

    function frame(now: number) {
      if (!live) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stepWater();
      renderWater();
      rhythm(dt);
      updateDrops(dt);
      raf = window.requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = window.requestAnimationFrame(frame);

    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "guest-water"}
      aria-hidden="true"
    />
  );
});
