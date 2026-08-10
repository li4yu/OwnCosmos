"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { CompanionJump } from "@/ai/companion-jumps";
import { scrubCompanionAnswer } from "@/ai/companion-jumps";
import { CompanionJumpRail } from "@/components/companion/companion-jump-rail";
import {
  PetSprite,
  petActionDurationMs,
  petMenuActions,
  resolvePetAnim,
  type PetAnim,
  DEFAULT_PET_MANIFEST,
  DEFAULT_PET_SHEET_URL,
} from "@/components/companion/pet-sprite";
import { CompanionPersonaSetup } from "@/components/companion/companion-persona-setup";
import { RECOMMENDED_QUESTIONS } from "@/ai/recommended-questions";
import {
  DEFAULT_COMPANION_NAME,
  DEFAULT_COMPANION_TONE,
  DEFAULT_USER_ADDRESS,
  type CompanionTone,
} from "@/db/schema";
import {
  COMPANION_BUBBLE_EVENT,
  COMPANION_PET_CHANGED,
  type CompanionBubbleDetail,
} from "@/lib/companion-client";
import type { PetManifest } from "@/lib/companion-pet";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  intent?: string | null;
  jumps?: CompanionJump[];
};

type Recommended = { id: string; label: string; text: string };

const FALLBACK_RECOMMENDED: Recommended[] = RECOMMENDED_QUESTIONS.map((q) => ({
  id: q.id,
  label: q.label,
  text: q.text,
}));

type Bubble = {
  id: string;
  category: string;
  label?: string;
  text: string;
  askText: string | null;
};

type Pref = {
  dnd: boolean;
  companionName: string;
  tone: CompanionTone;
  userAddress: string;
  personaReady: boolean;
  activePetSheetUrl: string;
  activePetManifest: PetManifest;
};
type Pos = { left: number; top: number };

const POS_KEY = "owncosmos-companion-pos";
const PET_SIZE = 108;
const DRAG_THRESHOLD = 6;

function petHeight(manifest: PetManifest) {
  return Math.round((PET_SIZE * manifest.frame.height) / manifest.frame.width);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function defaultPos(h: number): Pos {
  if (typeof window === "undefined") return { left: 24, top: 120 };
  return {
    left: Math.max(12, window.innerWidth - PET_SIZE - 24),
    top: Math.max(80, window.innerHeight - h - 24),
  };
}

function loadPos(h: number): Pos {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return defaultPos(h);
    const p = JSON.parse(raw) as Pos;
    if (typeof p.left !== "number" || typeof p.top !== "number") {
      return defaultPos(h);
    }
    return {
      left: clamp(p.left, 0, window.innerWidth - PET_SIZE),
      top: clamp(p.top, 0, window.innerHeight - h),
    };
  } catch {
    return defaultPos(h);
  }
}

export function CompanionShell({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const [infraReady, setInfraReady] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [recommended, setRecommended] =
    useState<Recommended[]>(FALLBACK_RECOMMENDED);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [intent, setIntent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [bubbleForced, setBubbleForced] = useState(false);
  const [pref, setPref] = useState<Pref>({
    dnd: false,
    companionName: DEFAULT_COMPANION_NAME,
    tone: DEFAULT_COMPANION_TONE,
    userAddress: DEFAULT_USER_ADDRESS,
    personaReady: false,
    activePetSheetUrl: DEFAULT_PET_SHEET_URL,
    activePetManifest: DEFAULT_PET_MANIFEST,
  });
  const petH = petHeight(pref.activePetManifest);
  const [waveOnce, setWaveOnce] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [failFlash, setFailFlash] = useState(false);
  const [pendingJumps, setPendingJumps] = useState<CompanionJump[]>([]);
  const [manualAnim, setManualAnim] = useState<PetAnim | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  const failTimerRef = useRef<number | null>(null);
  const actionTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    moved: boolean;
  } | null>(null);

  const loadConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversation");
      const data = (await res.json()) as {
        ok: boolean;
        infraReady?: boolean;
        conversation?: { id: string };
        messages?: ChatMessage[];
        recommended?: Recommended[];
      };
      if (!data.ok) {
        setRecommended(FALLBACK_RECOMMENDED);
        return;
      }
      setInfraReady(Boolean(data.infraReady));
      setConversationId(data.conversation?.id ?? null);
      setMessages(data.messages ?? []);
      setRecommended(
        data.recommended?.length ? data.recommended : FALLBACK_RECOMMENDED,
      );
    } catch {
      setRecommended(FALLBACK_RECOMMENDED);
    }
  }, []);

  const loadBubble = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/proactive");
      const data = (await res.json()) as { ok: boolean; bubble: Bubble | null };
      if (data.ok) setBubble(data.bubble);
    } catch {
      /* ignore */
    }
  }, []);

  const loadPref = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/companion-pref");
      const data = (await res.json()) as {
        ok: boolean;
        pref?: Pref & {
          activePetSheetUrl?: string;
          activePetManifest?: PetManifest;
        };
      };
      if (data.ok && data.pref) {
        setPref({
          dnd: data.pref.dnd,
          companionName: data.pref.companionName || DEFAULT_COMPANION_NAME,
          tone: data.pref.tone || DEFAULT_COMPANION_TONE,
          userAddress: data.pref.userAddress || DEFAULT_USER_ADDRESS,
          personaReady: Boolean(data.pref.personaReady),
          activePetSheetUrl:
            data.pref.activePetSheetUrl || DEFAULT_PET_SHEET_URL,
          activePetManifest:
            data.pref.activePetManifest || DEFAULT_PET_MANIFEST,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadConversation();
    void loadPref();
    void loadBubble();
  }, [loadBubble, loadConversation, loadPref]);

  useEffect(() => {
    setPos((prev) => {
      const next = prev ?? loadPos(petH);
      return {
        left: clamp(next.left, 0, window.innerWidth - PET_SIZE),
        top: clamp(next.top, 0, window.innerHeight - petH),
      };
    });
  }, [petH]);

  useEffect(() => {
    function onPetChanged() {
      void loadPref();
    }
    window.addEventListener(COMPANION_PET_CHANGED, onPetChanged);
    return () => window.removeEventListener(COMPANION_PET_CHANGED, onPetChanged);
  }, [loadPref]);

  useEffect(() => {
    function onCheer(e: Event) {
      const detail = (e as CustomEvent<CompanionBubbleDetail>).detail;
      if (!detail?.id || !detail.text) return;
      setBubbleForced(true);
      setOpen(false);
      setBubble({
        id: detail.id,
        category: detail.category,
        label: detail.label,
        text: detail.text,
        askText: detail.askText,
      });
    }
    window.addEventListener(COMPANION_BUBBLE_EVENT, onCheer);
    return () => window.removeEventListener(COMPANION_BUBBLE_EVENT, onCheer);
  }, []);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, streamBuf, open]);

  useEffect(() => {
    function onResize() {
      setPos((p) => {
        if (!p) return p;
        return {
          left: clamp(p.left, 0, window.innerWidth - PET_SIZE),
          top: clamp(p.top, 0, window.innerHeight - petH),
        };
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [petH]);

  useEffect(() => {
    return () => {
      if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
      if (failTimerRef.current) window.clearTimeout(failTimerRef.current);
      if (actionTimerRef.current) window.clearTimeout(actionTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  function playAction(anim: PetAnim) {
    setMenu(null);
    setWaveOnce(false);
    setJustFinished(false);
    setFailFlash(false);
    setManualAnim(anim);
    if (actionTimerRef.current) window.clearTimeout(actionTimerRef.current);
    actionTimerRef.current = window.setTimeout(() => {
      setManualAnim(null);
    }, petActionDurationMs(anim, pref.activePetManifest));
  }

  function celebrate() {
    setJustFinished(true);
    setFailFlash(false);
    if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = window.setTimeout(() => {
      setJustFinished(false);
    }, 2800);
  }

  function flashFail() {
    setFailFlash(true);
    setJustFinished(false);
    if (failTimerRef.current) window.clearTimeout(failTimerRef.current);
    failTimerRef.current = window.setTimeout(() => {
      setFailFlash(false);
    }, 2600);
  }

  function onPetPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!pos) return;
    if (e.button !== 0) return; // 仅左键拖动 / 点击
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: pos.left,
      origTop: pos.top,
      moved: false,
    };
  }

  function onPetPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    setPos({
      left: clamp(d.origLeft + dx, 0, window.innerWidth - PET_SIZE),
      top: clamp(d.origTop + dy, 0, window.innerHeight - petH),
    });
  }

  function onPetPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (d.moved) {
      setPos((p) => {
        if (!p) return p;
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(p));
        } catch {
          /* ignore */
        }
        return p;
      });
      return;
    }
    // 点击：开/关对话
    const next = !open;
    setOpen(next);
    if (next) {
      setWaveOnce(true);
      setError(null);
      void loadConversation();
    } else {
      setWaveOnce(false);
    }
  }

  async function dismissBubble() {
    if (!bubble) return;
    const id = bubble.id;
    setBubble(null);
    setBubbleForced(false);
    await fetch("/api/ai/proactive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: id }),
    }).catch(() => {});
  }

  async function toggleDnd() {
    const next = !pref.dnd;
    setPref((p) => ({ ...p, dnd: next }));
    if (next) setBubble(null);
    await fetch("/api/ai/companion-pref", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dnd: next }),
    }).catch(() => {});
  }

  async function newChat() {
    setError(null);
    setStreamBuf("");
    setIntent(null);
    const res = await fetch("/api/ai/conversation", { method: "POST" });
    const data = (await res.json()) as {
      ok: boolean;
      conversation?: { id: string };
      recommended?: Recommended[];
    };
    if (!data.ok) return;
    setConversationId(data.conversation?.id ?? null);
    setMessages([]);
    setRecommended(
      data.recommended?.length ? data.recommended : FALLBACK_RECOMMENDED,
    );
  }

  async function sendMessage(raw: string) {
    const text = raw.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    setOpen(true);
    setBubble(null);
    setStreaming(true);
    setStreamBuf("");
    setIntent(null);
    setPendingJumps([]);

    const tempUserId = `local-user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "user", content: text },
    ]);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        flashFail();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let answer = "";
      let assistantId = `local-a-${Date.now()}`;
      let turnIntent: string | null = null;
      let turnJumps: CompanionJump[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let ev: {
            type: string;
            conversationId?: string;
            intent?: string;
            text?: string;
            assistantMessageId?: string;
            jumps?: CompanionJump[];
            error?: string;
          };
          try {
            ev = JSON.parse(line.slice(5).trim()) as typeof ev;
          } catch {
            continue;
          }
          if (ev.type === "meta") {
            if (ev.conversationId) setConversationId(ev.conversationId);
            if (ev.intent) {
              turnIntent = ev.intent;
              setIntent(ev.intent);
            }
            if (ev.jumps) {
              turnJumps = ev.jumps;
              setPendingJumps(ev.jumps);
            }
          } else if (ev.type === "delta" && ev.text) {
            answer += ev.text;
            setStreamBuf(scrubCompanionAnswer(answer));
          } else if (ev.type === "done") {
            if (ev.assistantMessageId) assistantId = ev.assistantMessageId;
            if (ev.jumps) {
              turnJumps = ev.jumps;
              setPendingJumps(ev.jumps);
            }
          } else if (ev.type === "error") {
            setError(ev.error || "出错了");
          }
        }
      }

      if (answer) {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: scrubCompanionAnswer(answer),
            intent: turnIntent,
            jumps: turnJumps,
          },
        ]);
        celebrate();
      }
      setStreamBuf("");
      setPendingJumps([]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("请求失败");
        flashFail();
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  const petAnim = resolvePetAnim({
    open,
    streaming,
    error: failFlash,
    justFinished,
    waveOnce,
    manual: manualAnim,
    manifest: pref.activePetManifest,
  });
  const menuActions = petMenuActions(pref.activePetManifest);

  function stop() {
    abortRef.current?.abort();
  }

  if (!pos) return null;

  const panelAbove = pos.top > window.innerHeight * 0.45;
  const menuLeft = menu
    ? clamp(menu.x + 28, 8, window.innerWidth - 200)
    : 0;
  const menuTop = menu
    ? clamp(menu.y - 6, 8, window.innerHeight - 260)
    : 0;

  return (
    <>
    <div
      className="companion-root pointer-events-none fixed z-40"
      style={{
        left: pos.left,
        top: pos.top,
        width: PET_SIZE,
      }}
    >
      <div
        className={`companion-dock absolute right-0 flex w-max max-w-[min(92vw,360px)] flex-col items-end gap-2 ${
          panelAbove ? "companion-dock--above" : "companion-dock--below"
        }`}
      >
      {!open && bubble && (!pref.dnd || bubbleForced) ? (
        <div className="companion-bubble pointer-events-auto">
          <p className="companion-bubble__label">
            轻语 · {bubble.label || bubble.category}
          </p>
          <p className="companion-bubble__text">{bubble.text}</p>
          <div className="companion-bubble__actions">
            {bubble.askText ? (
              <button
                type="button"
                className="companion-bubble__btn companion-bubble__btn--primary"
                onClick={() => {
                  void dismissBubble();
                  void sendMessage(bubble.askText!);
                }}
              >
                问问它
              </button>
            ) : null}
            <button
              type="button"
              className="companion-bubble__btn"
              onClick={() => void dismissBubble()}
            >
              关掉
            </button>
          </div>
          <span
            className={
              panelAbove
                ? "companion-bubble__tail companion-bubble__tail--down"
                : "companion-bubble__tail companion-bubble__tail--up"
            }
            aria-hidden
          />
        </div>
      ) : null}

      {open ? (
        <section className="companion-chat pointer-events-auto flex h-[min(70vh,520px)] w-[min(92vw,360px)] flex-col overflow-hidden">
          <header className="companion-chat__head flex items-center justify-between gap-2">
            <div>
              <p className="companion-chat__eyebrow">{pref.companionName}</p>
              <p className="companion-chat__status">
                {pref.personaReady
                  ? infraReady
                    ? "就绪"
                    : "AI 未启用"
                  : "认识一下"}
                {pref.personaReady && intent ? ` · ${intent}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {pref.personaReady ? (
                <button
                  type="button"
                  className="companion-chat__tool"
                  onClick={() => void toggleDnd()}
                  title="勿扰：关闭主动气泡"
                >
                  {pref.dnd ? "勿扰开" : "勿扰"}
                </button>
              ) : null}
              {pref.personaReady ? (
                <button
                  type="button"
                  className="companion-chat__tool"
                  onClick={() => void newChat()}
                >
                  新开
                </button>
              ) : null}
              <button
                type="button"
                className="companion-chat__tool"
                onClick={() => setOpen(false)}
              >
                收起
              </button>
            </div>
          </header>

          {!pref.personaReady ? (
            <div className="companion-chat__body flex-1 overflow-y-auto">
              <CompanionPersonaSetup
                userName={userName}
                initial={{
                  companionName: pref.companionName,
                  tone: pref.tone,
                  userAddress: pref.userAddress || userName,
                  personaReady: false,
                }}
                onSaved={(p) => {
                  setPref((prev) => ({
                    ...prev,
                    companionName: p.companionName,
                    tone: p.tone,
                    userAddress: p.userAddress,
                    personaReady: p.personaReady,
                  }));
                }}
              />
            </div>
          ) : (
            <>
          <div
            ref={listRef}
            className="companion-chat__body flex-1 space-y-2 overflow-y-auto"
          >
            {messages.length === 0 && !streamBuf ? (
              <div className="space-y-2">
                <p className="text-sm text-[var(--mist)]">
                  {pref.userAddress !== "你" ? pref.userAddress : userName}
                  ，想问用法、过往、临期或专注，直接说即可；也可以找我随便聊聊。
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recommended.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      disabled={!infraReady || streaming}
                      className="companion-chat__chip"
                      onClick={() => void sendMessage(q.text)}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((m) => (
              <article
                key={m.id}
                className={
                  m.role === "user"
                    ? "companion-chat__bubble companion-chat__bubble--user"
                    : "companion-chat__bubble companion-chat__bubble--assistant"
                }
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {m.role === "assistant" && m.intent ? (
                  <p className="companion-chat__intent">{m.intent}</p>
                ) : null}
                {m.role === "assistant" && m.jumps?.length ? (
                  <CompanionJumpRail jumps={m.jumps} />
                ) : null}
              </article>
            ))}

            {streamBuf ? (
              <article className="companion-chat__bubble companion-chat__bubble--stream">
                <p className="whitespace-pre-wrap break-words">{streamBuf}</p>
                {pendingJumps.length ? (
                  <CompanionJumpRail jumps={pendingJumps} />
                ) : null}
              </article>
            ) : null}

            {error ? (
              <p className="text-xs text-[var(--danger)]">{error}</p>
            ) : null}
          </div>

          <footer className="companion-chat__foot">
            <div className="flex gap-1.5">
              <textarea
                className="companion-chat__input min-h-[40px] flex-1 resize-none"
                placeholder={infraReady ? "说点什么…" : "请先配置 AI 环境"}
                value={input}
                disabled={!infraReady || streaming}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              {streaming ? (
                <button
                  type="button"
                  className="companion-chat__tool self-end"
                  onClick={stop}
                >
                  停止
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!infraReady || !input.trim()}
                  className="companion-chat__send self-end"
                  onClick={() => void sendMessage(input)}
                >
                  发送
                </button>
              )}
            </div>
          </footer>
            </>
          )}
        </section>
      ) : null}
      </div>

      <button
        type="button"
        aria-label={`打开伴读桌宠 ${pref.activePetManifest.displayName}（左键开窗，右键动作，可拖动）`}
        className="companion-pet-btn pointer-events-auto relative touch-none"
        onPointerDown={onPetPointerDown}
        onPointerMove={onPetPointerMove}
        onPointerUp={onPetPointerUp}
        onPointerCancel={onPetPointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = null;
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <PetSprite
          anim={petAnim}
          size={PET_SIZE}
          manifest={pref.activePetManifest}
          sheetUrl={pref.activePetSheetUrl}
          className="companion-pet-btn__sprite"
          title="左键开窗 · 右键动作 · 拖动移动"
          onOneShotEnd={() => {
            setWaveOnce(false);
            if (manualAnim === "wave" || manualAnim === "jump") {
              setManualAnim(null);
            }
          }}
        />
      </button>
    </div>

    {menu && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="companion-pet-menu"
            style={{ left: menuLeft, top: menuTop }}
            role="menu"
          >
            <p className="companion-pet-menu__label">
              互动 · {pref.activePetManifest.displayName}
            </p>
            <div className="companion-pet-menu__grid">
              {menuActions.map((a) => (
                <button
                  key={a.anim}
                  type="button"
                  role="menuitem"
                  className="ui-btn-ghost ui-btn-sm companion-pet-menu__btn"
                  onClick={() => playAction(a.anim)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="companion-pet-menu__foot">左键开窗 · 拖动可挪位置</p>
          </div>,
          document.body,
        )
      : null}
    </>
  );
}
