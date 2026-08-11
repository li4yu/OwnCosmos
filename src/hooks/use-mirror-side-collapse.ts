"use client";

import { useEffect, useState } from "react";

const PREFIX = "owncosmos-mirror-side";

/** 镜台左侧铭文栏收起状态（按模块持久化） */
export function useMirrorSideCollapse(storageKey: string) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${PREFIX}:${storageKey}`);
      setCollapsed(raw === "1");
    } catch {
      setCollapsed(false);
    }
    setReady(true);
  }, [storageKey]);

  function setSideCollapsed(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(`${PREFIX}:${storageKey}`, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function toggle() {
    setSideCollapsed(!collapsed);
  }

  return { collapsed, ready, toggle, setSideCollapsed };
}
