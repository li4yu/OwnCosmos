"use client";

import { consumeAppArriveFlag } from "@/lib/app-arrive";
import { useLayoutEffect, useState, type ReactNode } from "react";

const ARRIVE_MS = 1800;

/** Strict Mode 双挂载时第二轮仍能播完进站动画 */
let arriveArmedThisLoad = false;

type AppAtmosphereProps = {
  children: ReactNode;
  className?: string;
};

/**
 * 登录后壳层根：承接欢迎页/登录进站 flag，播约 1.8s 淡入。
 * 书签直达、站内跳转无动画。
 */
export function AppAtmosphere({ children, className }: AppAtmosphereProps) {
  const [arriving, setArriving] = useState(false);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const startArrive = () => {
      if (reduce) {
        arriveArmedThisLoad = false;
        return;
      }
      setArriving(true);
      return window.setTimeout(() => {
        arriveArmedThisLoad = false;
        setArriving(false);
      }, ARRIVE_MS);
    };

    if (arriveArmedThisLoad) {
      const t = startArrive();
      return () => {
        if (t) window.clearTimeout(t);
      };
    }

    if (!consumeAppArriveFlag()) return;

    arriveArmedThisLoad = true;
    const t = startArrive();
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, []);

  return (
    <div
      className={`atmosphere-wash min-h-screen${arriving ? " is-arriving" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </div>
  );
}
