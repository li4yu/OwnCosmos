"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPlanAction, deletePlanAction } from "@/app/app/future/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { PoeticName } from "@/components/ui/poetic-name";
import { PLAN_KIND_CAPSULE } from "@/db/schema";
import { formatDueDateInput, parseDueDateInput } from "@/lib/plan-dates";
import { isCapsuleLocked } from "@/lib/plan-kinds";

export type CapsuleChamberItem = {
  id: string;
  title: string;
  body: string;
  dueLabel: string;
  locked: boolean;
};

type CapsuleChamberProps = {
  items: CapsuleChamberItem[];
  initialCompose?: boolean;
  initialOpenId?: string | null;
};

type Mode = "lobby" | "compose" | "sealing" | "unlocking" | "view";

function useStarField(count: number) {
  return useMemo(() => {
    const stars: {
      left: string;
      top: string;
      size: number;
      delay: string;
      dur: string;
    }[] = [];
    let seed = 131;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i += 1) {
      stars.push({
        left: `${rand() * 100}%`,
        top: `${rand() * 100}%`,
        size: 1 + rand() * 2.2,
        delay: `${rand() * 10}s`,
        dur: `${3.5 + rand() * 7}s`,
      });
    }
    return stars;
  }, [count]);
}

function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 全屏散列落点（上下左右都覆盖） */
function nodeAnchorStyle(id: string, index: number, total: number): CSSProperties {
  const h = hashId(id) ^ (index * 9973);
  const h2 = hashId(`${id}:pos`) ^ 0x9e3779b9;
  // 均匀铺开：按序号占满整屏网格，再加少量抖动
  const cols = Math.max(2, Math.ceil(Math.sqrt(Math.max(total, 1))));
  const rows = Math.max(2, Math.ceil(total / cols));
  const c = index % cols;
  const r = Math.floor(index / cols) % rows;
  // 留边，避免慢游时贴边被裁切
  const left = 16 + (c + 0.5) * (68 / cols) + ((h % 7) - 3);
  const top = 18 + (r + 0.5) * (62 / rows) + ((h2 % 7) - 3);
  const dur = 22 + (h % 12);
  const delay = -((h2 % 14) + 1);
  return {
    left: `${Math.min(84, Math.max(16, left))}%`,
    top: `${Math.min(80, Math.max(16, top))}%`,
    "--dur": `${dur}s`,
    "--delay": `${delay}s`,
  } as CSSProperties;
}

export function CapsuleChamber({
  items,
  initialCompose = false,
  initialOpenId = null,
}: CapsuleChamberProps) {
  const router = useRouter();
  const chamberRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const stars = useStarField(56);
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<Mode>(
    initialCompose ? "compose" : "lobby",
  );
  const [activeId, setActiveId] = useState<string | null>(initialOpenId);
  const [hint, setHint] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState(() => formatDueDateInput(new Date()));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [localItems, setLocalItems] = useState(items);
  const [readyOpen, setReadyOpen] = useState(true);

  const unlockedItems = useMemo(
    () => localItems.filter((item) => !item.locked),
    [localItems],
  );

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const active = useMemo(
    () => localItems.find((item) => item.id === activeId) ?? null,
    [localItems, activeId],
  );

  useEffect(() => {
    if (!initialOpenId) return;
    const target = items.find((item) => item.id === initialOpenId);
    if (!target) return;
    setActiveId(initialOpenId);
    if (target.locked) {
      setHint(`尚未解锁 · ${target.dueLabel} 起可读`);
      setMode("lobby");
      return;
    }
    setMode("unlocking");
  }, [initialOpenId, items]);

  useEffect(() => {
    if (mode !== "sealing") return;
    const t = window.setTimeout(() => {
      setMode("lobby");
      setTitle("");
      setBody("");
      setDueAt(formatDueDateInput(new Date()));
      router.refresh();
    }, 1100);
    return () => window.clearTimeout(t);
  }, [mode, router]);

  useEffect(() => {
    if (mode !== "unlocking") return;
    const t = window.setTimeout(() => setMode("view"), 780);
    return () => window.clearTimeout(t);
  }, [mode]);

  function openCapsule(item: CapsuleChamberItem) {
    setError(null);
    setActiveId(item.id);
    if (item.locked) {
      setHint(`未解锁 · 解锁日 ${item.dueLabel}`);
      window.setTimeout(() => setHint(null), 2800);
      return;
    }
    setHint(null);
    setMode("unlocking");
  }

  function sealCapsule() {
    setError(null);
    const fd = new FormData();
    fd.set("kind", PLAN_KIND_CAPSULE);
    fd.set("title", title);
    fd.set("body", body);
    fd.set("dueAt", dueAt);
    fd.set("remindDays", "3");
    startTransition(async () => {
      const result = await createPlanAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.createdId) {
        const due = parseDueDateInput(dueAt);
        setLocalItems((prev) => [
          ...prev,
          {
            id: result.createdId!,
            title: title.trim() || "无标题",
            body,
            dueLabel: dueAt,
            locked: isCapsuleLocked(PLAN_KIND_CAPSULE, due),
          },
        ]);
      }
      setMode("sealing");
    });
  }

  function confirmDelete() {
    if (!active || active.locked) return;
    startTransition(async () => {
      const result = await deletePlanAction(active.id);
      if (result.error) {
        setError(result.error);
        setDeleteOpen(false);
        return;
      }
      setLocalItems((prev) => prev.filter((item) => item.id !== active.id));
      setDeleteOpen(false);
      setActiveId(null);
      setMode("lobby");
      router.refresh();
    });
  }

  return (
    <div
      ref={chamberRef}
      className={`capsule-chamber ${entered ? "is-entered" : ""} capsule-chamber--${mode}`}
    >
      <div className="capsule-chamber__nebula" aria-hidden="true" />
      <div className="capsule-chamber__veil" aria-hidden="true" />
      <div className="capsule-chamber__stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className="capsule-chamber__star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: s.delay,
              animationDuration: s.dur,
            }}
          />
        ))}
      </div>

      <header className="capsule-chamber__chrome">
        <Link href="/app/future" className="capsule-chamber__nav">
          ← 来日途
        </Link>
        <div className="capsule-chamber__brand">
          <p className="capsule-chamber__eyebrow">来日途 · 时间胶囊</p>
          <h1 className="capsule-chamber__title">
            <PoeticName
              name="时间胶囊"
              tip="写给未来的自己；封存后不可改，解锁日当天起可读"
            />
          </h1>
        </div>
        <span className="capsule-chamber__nav capsule-chamber__nav--ghost">
          {localItems.length} 枚
        </span>
      </header>

      {(mode === "lobby" || mode === "sealing") && (
        <div className="capsule-chamber__field" aria-label="已封存的胶囊">
          {localItems.length === 0 ? (
            <p className="capsule-chamber__empty">
              星野还空着。写一段话，选一个解锁日封存。
            </p>
          ) : (
            localItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`capsule-chamber__node ${item.locked ? "is-locked" : "is-ready"}`}
                style={nodeAnchorStyle(item.id, index, localItems.length)}
                onClick={() => openCapsule(item)}
                aria-label={`${item.locked ? "未解锁" : "已解锁"}：${item.title}`}
                title={`${item.title} · 解锁 ${item.dueLabel}`}
              >
                <span
                  className="capsule-chamber__node-float"
                  data-path={String((hashId(item.id) % 4) + 1)}
                  aria-hidden="true"
                >
                  <span className="capsule-chamber__node-core" />
                  <span className="capsule-chamber__node-ring" />
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {mode === "lobby" && unlockedItems.length > 0 ? (
        <aside
          className={`capsule-chamber__ready ${readyOpen ? "is-open" : ""}`}
          aria-label="已解锁快捷查看"
        >
          <button
            type="button"
            className="capsule-chamber__ready-toggle"
            onClick={() => setReadyOpen((v) => !v)}
            aria-expanded={readyOpen}
          >
            <span className="capsule-chamber__ready-dot" aria-hidden="true" />
            已解锁 {unlockedItems.length}
            <span className="capsule-chamber__ready-chevron" aria-hidden="true">
              {readyOpen ? "›" : "‹"}
            </span>
          </button>
          {readyOpen ? (
            <ul className="capsule-chamber__ready-list">
              {unlockedItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="capsule-chamber__ready-item"
                    onClick={() => openCapsule(item)}
                  >
                    <span className="capsule-chamber__ready-item-title">
                      {item.title}
                    </span>
                    <span className="capsule-chamber__ready-item-date">
                      {item.dueLabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      ) : null}

      {mode === "lobby" ? (
        <div className="capsule-chamber__dock">
          {hint ? (
            <p className="capsule-chamber__hint" role="status">
              {hint}
            </p>
          ) : null}
          <button
            type="button"
            className="capsule-chamber__primary"
            onClick={() => {
              setError(null);
              setMode("compose");
            }}
          >
            封存胶囊
          </button>
        </div>
      ) : null}

      {mode === "compose" ? (
        <div className="capsule-chamber__stage">
          <div className="capsule-chamber__panel" role="form" aria-labelledby={titleId}>
            <div className="capsule-chamber__panel-head">
              <p className="capsule-chamber__panel-kicker">SEAL</p>
              <h2 id={titleId} className="capsule-chamber__panel-title">
                写给未来的自己
              </h2>
              <p className="capsule-chamber__panel-note">
                封存后不可修改；解锁日当天起可读，解锁后可删除。
              </p>
            </div>
            <div className="capsule-chamber__panel-scroll">
              <label className="capsule-chamber__field-label">
                标题
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="auth-field"
                  placeholder="一句话称呼…"
                  maxLength={80}
                />
              </label>
              <label className="capsule-chamber__field-label">
                正文
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="auth-field capsule-chamber__body-input leading-7"
                  placeholder="写一段只会在未来拆开的话…"
                  rows={6}
                />
              </label>
              <div className="capsule-chamber__field-label">
                <DatePickerField
                  name="dueAt"
                  value={dueAt}
                  onChange={setDueAt}
                  label="解锁日"
                />
              </div>
              {error ? (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="capsule-chamber__panel-actions">
              <button
                type="button"
                className="ui-btn-ghost"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  setMode("lobby");
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="capsule-chamber__primary"
                disabled={pending}
                onClick={sealCapsule}
              >
                {pending ? "封存中…" : "封存"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "sealing" ? (
        <div className="capsule-chamber__fx capsule-chamber__fx--seal" aria-live="polite">
          <span className="capsule-chamber__fx-core" />
          <span className="capsule-chamber__fx-ring" />
          <span className="capsule-chamber__fx-ring capsule-chamber__fx-ring--delay" />
          <p className="capsule-chamber__fx-text">封存中…</p>
        </div>
      ) : null}

      {mode === "unlocking" ? (
        <div className="capsule-chamber__fx capsule-chamber__fx--unlock" aria-live="polite">
          <span className="capsule-chamber__fx-core" />
          <span className="capsule-chamber__fx-ring" />
          <span className="capsule-chamber__fx-ring capsule-chamber__fx-ring--delay" />
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="capsule-chamber__fx-particle"
              style={{ "--i": String(i) } as CSSProperties}
            />
          ))}
          <p className="capsule-chamber__fx-text">启封…</p>
        </div>
      ) : null}

      {mode === "view" && active && !active.locked ? (
        <div className="capsule-chamber__stage">
          <div
            className="capsule-chamber__panel capsule-chamber__panel--view"
            role="dialog"
            aria-labelledby={titleId}
          >
            <div className="capsule-chamber__panel-head">
              <p className="capsule-chamber__panel-kicker">UNLOCKED</p>
              <h2 id={titleId} className="capsule-chamber__panel-title">
                {active.title}
              </h2>
              <p className="font-mono text-[10px] tracking-wide text-[var(--mist)]">
                解锁日 {active.dueLabel}
              </p>
            </div>
            <div className="capsule-chamber__panel-scroll">
              <div className="capsule-chamber__letter">
                {active.body.trim() || "（无正文）"}
              </div>
              {error ? (
                <p className="text-sm text-[var(--danger)]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="capsule-chamber__panel-actions">
              <button
                type="button"
                className="ui-btn-ghost"
                onClick={() => {
                  setActiveId(null);
                  setMode("lobby");
                }}
              >
                收回星野
              </button>
              <button
                type="button"
                className="ui-btn-danger"
                disabled={pending}
                onClick={() => setDeleteOpen(true)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="删除这枚胶囊？"
        message="删除后不可恢复。确定吗？"
        confirmLabel="删除"
        cancelLabel="取消"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
