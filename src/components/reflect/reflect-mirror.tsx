"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SelectField } from "@/components/ui/select-field";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { IconActionButton, IconActionLink } from "@/components/ui/icon-action";
import {
  IconArrowLeft,
  IconRefresh,
  IconSend,
  IconStop,
} from "@/components/ui/icon-glyphs";
import { MirrorSideToggle } from "@/components/shell/mirror-side-toggle";
import { useMirrorSideCollapse } from "@/hooks/use-mirror-side-collapse";

export type ReflectArchiveOpt = {
  id: string;
  title: string;
  type: string;
  archivedAt: string;
};

type View = "echo" | "period" | "dual" | "traces";

type Msg = { id: string; role: string; content: string };

type ReportRow = {
  id: string;
  kind: string;
  title: string;
  createdAt: string;
  archiveItemId: string | null;
};

const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "echo", label: "对镜", hint: "与缩影对话" },
  { id: "period", label: "照时", hint: "回看一段日子" },
  { id: "dual", label: "对照", hint: "昔时与此刻" },
  { id: "traces", label: "留痕", hint: "已写下的报告" },
];

function parseView(raw: string | null | undefined): View {
  if (raw === "period" || raw === "dual" || raw === "traces") return raw;
  return "echo";
}

function syncViewUrl(next: View) {
  if (typeof window === "undefined") return;
  const q = next === "echo" ? "/app/reflect" : `/app/reflect?view=${next}`;
  window.history.replaceState(window.history.state, "", q);
}

export function ReflectMirror({
  archives,
  initialView = "echo",
}: {
  archives: ReflectArchiveOpt[];
  initialView?: View;
}) {
  const [view, setViewState] = useState<View>(() => parseView(initialView));
  const { collapsed, toggle } = useMirrorSideCollapse("reflect");

  function setView(next: View) {
    setViewState(next);
    syncViewUrl(next);
  }

  return (
    <div
      className={
        collapsed ? "oc-mirror oc-mirror--side-collapsed" : "oc-mirror"
      }
    >
      <div className="oc-mirror__veil" aria-hidden>
        <span className="oc-mirror__orb oc-mirror__orb--a" />
        <span className="oc-mirror__orb oc-mirror__orb--b" />
        <span className="oc-mirror__grain" />
      </div>

      <aside className="oc-mirror__side" aria-label="自省铭文栏">
        {collapsed ? (
          <MirrorSideToggle collapsed onToggle={toggle} variant="rail" />
        ) : (
          <>
            <div className="oc-mirror__side-toolbar">
              <MirrorSideToggle
                collapsed={false}
                onToggle={toggle}
                variant="panel"
              />
            </div>
            <div className="oc-mirror__side-body">
              <header className="oc-mirror__inscribe">
                <p className="oc-mirror__eyebrow">MIRROR</p>
                <h1 className="oc-mirror__motto" lang="zh-Hans">
                  以镜自省
                </h1>
                <p className="oc-mirror__sub">对着过往，看清此刻的自己</p>
              </header>

              <nav className="oc-mirror__modes" aria-label="自省方式">
                {VIEWS.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    className={
                      view === v.id
                        ? "oc-mirror__mode oc-mirror__mode--on"
                        : "oc-mirror__mode"
                    }
                    onClick={() => setView(v.id)}
                  >
                    <span className="oc-mirror__mode-idx">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="oc-mirror__mode-copy">
                      <span className="oc-mirror__mode-label">{v.label}</span>
                      <span className="oc-mirror__mode-hint">{v.hint}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </>
        )}
      </aside>

      <section className="oc-mirror__looking" aria-label="镜面">
        <div className="oc-mirror__rim" aria-hidden />
        <div className="oc-mirror__glass">
          <div className="oc-mirror__pane" key={view}>
            {view === "echo" ? <EchoPane /> : null}
            {view === "period" ? <PeriodPane /> : null}
            {view === "dual" ? <DualPane archives={archives} /> : null}
            {view === "traces" ? <TracesPane /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function EchoPane() {
  const [infraReady, setInfraReady] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<
    { id: string; title: string | null; updatedAt: string; closedAt: string | null }[]
  >([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuf, setStreamBuf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  function applyConversations(
    rows:
      | {
          id: string;
          title: string | null;
          updatedAt: string | Date;
          closedAt: string | Date | null;
        }[]
      | undefined,
  ) {
    setConversations(
      (rows ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt:
          typeof c.updatedAt === "string"
            ? c.updatedAt
            : new Date(c.updatedAt).toISOString(),
        closedAt:
          c.closedAt == null
            ? null
            : typeof c.closedAt === "string"
              ? c.closedAt
              : new Date(c.closedAt).toISOString(),
      })),
    );
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/reflect/conversation");
      const data = (await res.json()) as {
        ok: boolean;
        infraReady?: boolean;
        conversation?: { id: string };
        conversations?: {
          id: string;
          title: string | null;
          updatedAt: string | Date;
          closedAt: string | Date | null;
        }[];
        messages?: Msg[];
      };
      if (!data.ok) {
        setError("无法加载对镜会话");
        return;
      }
      setInfraReady(Boolean(data.infraReady));
      setConversationId(data.conversation?.id ?? null);
      applyConversations(data.conversations);
      setMessages(data.messages ?? []);
    } catch {
      setError("无法加载对镜会话");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, streamBuf]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || streaming) return;
    setError(null);
    setInput("");
    setStreaming(true);
    setStreamBuf("");
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, role: "user", content: msg },
    ]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/ai/reflect/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversationId }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "发送失败");
        setStreaming(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          try {
            const ev = JSON.parse(json) as {
              type: string;
              conversationId?: string;
              text?: string;
              error?: string;
            };
            if (ev.type === "conversation" && ev.conversationId) {
              setConversationId(ev.conversationId);
            }
            if (ev.type === "delta" && ev.text) {
              full += ev.text;
              setStreamBuf(full);
            }
            if (ev.type === "error") setError(ev.error || "出错了");
            if (ev.type === "done") {
              setMessages((m) => [
                ...m,
                {
                  id: `a-${Date.now()}`,
                  role: "assistant",
                  content: full || streamBuf,
                },
              ]);
              setStreamBuf("");
              void load();
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("网络异常");
    } finally {
      setStreaming(false);
    }
  }

  async function newChat() {
    const res = await fetch("/api/ai/reflect/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "new" }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      conversation?: { id: string };
      conversations?: {
        id: string;
        title: string | null;
        updatedAt: string | Date;
        closedAt: string | Date | null;
      }[];
    };
    if (data.ok && data.conversation) {
      setConversationId(data.conversation.id);
      applyConversations(data.conversations);
      setMessages([]);
      setStreamBuf("");
    }
  }

  async function switchChat(nextId: string) {
    if (!nextId || nextId === conversationId || streaming) return;
    setError(null);
    const res = await fetch("/api/ai/reflect/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", conversationId: nextId }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      conversation?: { id: string };
      conversations?: {
        id: string;
        title: string | null;
        updatedAt: string | Date;
        closedAt: string | Date | null;
      }[];
      messages?: Msg[];
    };
    if (!res.ok || !data.ok || !data.conversation) {
      setError(data.error || "无法切换会话");
      return;
    }
    setConversationId(data.conversation.id);
    applyConversations(data.conversations);
    setMessages(data.messages ?? []);
    setStreamBuf("");
  }

  async function deleteChat(targetId: string) {
    if (!targetId || streaming || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/reflect/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          conversationId: targetId,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        conversation?: { id: string };
        conversations?: {
          id: string;
          title: string | null;
          updatedAt: string | Date;
          closedAt: string | Date | null;
        }[];
        messages?: Msg[];
      };
      if (!res.ok || !data.ok || !data.conversation) {
        setError(data.error || "删除失败");
        return;
      }
      setConversationId(data.conversation.id);
      applyConversations(data.conversations);
      setMessages(data.messages ?? []);
      setStreamBuf("");
      setPendingDeleteId(null);
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }

  const selectOptions = conversations.map((c) => {
    const day = c.updatedAt.slice(0, 10);
    const label = (c.title?.trim() || "未命名对镜").slice(0, 28);
    return {
      value: c.id,
      label,
      hint: c.closedAt ? `${day} · 已拭` : `${day} · 当前`,
    };
  });

  const pendingTitle =
    conversations.find((c) => c.id === pendingDeleteId)?.title?.trim() ||
    "未命名对镜";

  return (
    <div className="oc-mirror__echo">
      <div className="oc-mirror__toolbar">
        <div className="oc-mirror__toolbar-main">
          <p className="oc-mirror__lead">
            镜中是过去自己的缩影——只依据你已藏忆的馆藏作答。关闭超过 90
            天或过多的旧对镜会自动清理。
          </p>
          {conversationId && selectOptions.length > 0 ? (
            <SelectField
              label="往昔对镜"
              className="oc-mirror__conv-select"
              value={conversationId}
              options={selectOptions}
              disabled={streaming || deleting}
              onChange={(id) => void switchChat(id)}
              optionAction={{
                label: "删除",
                onClick: (id) => setPendingDeleteId(id),
              }}
            />
          ) : null}
        </div>
        <IconActionButton
          label="拭镜重开"
          className="oc-icon-action--ghost"
          disabled={streaming || deleting}
          onClick={() => void newChat()}
        >
          <IconRefresh size={15} />
        </IconActionButton>
      </div>
      {!infraReady ? (
        <p className="oc-mirror__warn">AI 未启用。配置环境变量后再对镜。</p>
      ) : null}
      <div ref={listRef} className="oc-mirror__thread">
        {messages.length === 0 && !streamBuf ? (
          <p className="oc-mirror__empty">
            「那段日子我在想什么？」——问镜中人，也问自己。
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "oc-mirror__bubble oc-mirror__bubble--you"
                : "oc-mirror__bubble oc-mirror__bubble--echo"
            }
          >
            <span className="oc-mirror__who">
              {m.role === "user" ? "你" : "缩影"}
            </span>
            <p>{m.content}</p>
          </div>
        ))}
        {streamBuf ? (
          <div className="oc-mirror__bubble oc-mirror__bubble--echo">
            <span className="oc-mirror__who">缩影</span>
            <p>{streamBuf}</p>
          </div>
        ) : null}
      </div>
      {error ? <p className="oc-mirror__err">{error}</p> : null}
      <form
        className="oc-mirror__composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          className="oc-mirror__input"
          value={input}
          disabled={streaming || !infraReady || deleting}
          placeholder="对镜轻语…"
          onChange={(e) => setInput(e.target.value)}
        />
        {streaming ? (
          <IconActionButton
            label="停止"
            className="oc-icon-action--ghost"
            onClick={() => abortRef.current?.abort()}
          >
            <IconStop size={14} />
          </IconActionButton>
        ) : (
          <IconActionButton
            label="发送"
            className="oc-icon-action--primary"
            type="submit"
            disabled={!infraReady || deleting}
          >
            <IconSend size={14} />
          </IconActionButton>
        )}
      </form>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="删除这段对镜？"
        message={`将永久删除「${pendingTitle}」及其全部消息，不可恢复。`}
        confirmLabel={deleting ? "删除中…" : "删除"}
        cancelLabel="留下"
        tone="danger"
        pending={deleting}
        onConfirm={() => {
          if (pendingDeleteId) void deleteChat(pendingDeleteId);
        }}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
      />
    </div>
  );
}

function PeriodPane() {
  const router = useRouter();
  const [start, setStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/reflect/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "period",
          rangeStart: `${start}T00:00:00.000Z`,
          rangeEnd: `${end}T23:59:59.999Z`,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        report?: { id: string };
      };
      if (!res.ok || !data.ok || !data.report) {
        setError(data.error || "生成失败");
        return;
      }
      router.push(`/app/reflect/reports/${data.report.id}`);
    } catch {
      setError("生成失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="oc-mirror__form">
      <p className="oc-mirror__lead">
        选定一段日子，让缩影照见其间的痕迹，写成可回看的报告。
      </p>
      <div className="oc-mirror__dates">
        <DatePickerField
          name="reflect-period-start"
          label="起"
          className="oc-mirror__date"
          value={start}
          allowPastDates
          maxDate={end}
          onChange={setStart}
        />
        <DatePickerField
          name="reflect-period-end"
          label="止"
          className="oc-mirror__date"
          value={end}
          allowPastDates
          minDate={start}
          onChange={setEnd}
        />
      </div>
      {error ? <p className="oc-mirror__err">{error}</p> : null}
      <button
        type="button"
        className="oc-mirror__primary"
        disabled={pending}
        onClick={() => void generate()}
      >
        {pending ? "照映中…" : "照这一段"}
      </button>
    </div>
  );
}

function DualPane({ archives }: { archives: ReflectArchiveOpt[] }) {
  const router = useRouter();
  const [pastId, setPastId] = useState(archives[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/reflect/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "dual",
          pastArchiveId: pastId,
          presentNote: note,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        report?: { id: string };
      };
      if (!res.ok || !data.ok || !data.report) {
        setError(data.error || "生成失败");
        return;
      }
      router.push(`/app/reflect/reports/${data.report.id}`);
    } catch {
      setError("生成失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  if (archives.length === 0) {
    return (
      <div className="oc-mirror__form">
        <p className="oc-mirror__lead">
          尚无已藏忆馆藏。先在昔时往对条目「藏忆」，再来对照。
        </p>
        <Link href="/app/past/gallery" className="oc-mirror__ghost">
          去馆藏 →
        </Link>
      </div>
    );
  }

  return (
    <div className="oc-mirror__form">
      <p className="oc-mirror__lead">
        一面是昔时馆藏，一面是此刻自述——让缩影替你对照。
      </p>
      <SelectField
        label="昔时一面"
        value={pastId}
        options={archives.map((a) => ({
          value: a.id,
          label: a.title || "无标题",
          hint: `${a.type} · ${a.archivedAt}`,
        }))}
        onChange={setPastId}
      />
      <label className="oc-mirror__field">
        <span>此刻一面</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="此刻你在想什么、感受如何…"
        />
      </label>
      {error ? <p className="oc-mirror__err">{error}</p> : null}
      <button
        type="button"
        className="oc-mirror__primary"
        disabled={pending || !pastId || !note.trim()}
        onClick={() => void generate()}
      >
        {pending ? "对照中…" : "两面相对"}
      </button>
    </div>
  );
}

function TracesPane() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadReports() {
    try {
      const res = await fetch("/api/ai/reflect/reports");
      const data = (await res.json()) as {
        ok: boolean;
        reports?: {
          id: string;
          kind: string;
          title: string;
          createdAt: string | Date;
          archiveItemId: string | null;
        }[];
      };
      if (!data.ok) {
        setError("无法加载留痕");
        return;
      }
      setReports(
        (data.reports ?? []).map((r) => ({
          ...r,
          createdAt:
            typeof r.createdAt === "string"
              ? r.createdAt.slice(0, 10)
              : new Date(r.createdAt).toISOString().slice(0, 10),
        })),
      );
    } catch {
      setError("无法加载留痕");
    }
  }

  useEffect(() => {
    void loadReports();
  }, []);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/reflect/reports/${deleteTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "删除失败");
        return;
      }
      setReports((list) => list.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="oc-mirror__form oc-mirror__form--traces">
      <p className="oc-mirror__lead">
        镜中曾照见的报告，可落笔、归档或藏忆；删除会一并清掉馆藏对应条目。
      </p>
      {error ? <p className="oc-mirror__err">{error}</p> : null}
      {reports.length === 0 ? (
        <p className="oc-mirror__empty">尚无留痕。先「照时」或「对照」写下一份。</p>
      ) : (
        <ul className="oc-mirror__traces">
          {reports.map((r) => (
            <li key={r.id} className="oc-mirror__trace-row">
              <Link href={`/app/reflect/reports/${r.id}`}>
                <span className="oc-mirror__trace-title">{r.title}</span>
                <span className="oc-mirror__trace-meta">
                  {r.kind === "dual" ? "对照" : "照时"} · {r.createdAt}
                  {r.archiveItemId ? " · 已归档" : ""}
                </span>
              </Link>
              <button
                type="button"
                className="oc-mirror__trace-trash"
                aria-label={`删除：${r.title}`}
                title="删除留痕"
                disabled={deleting}
                onClick={() => setDeleteTarget(r)}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M4 7h16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9 7V5.8c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3V7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M6.5 7l.8 12.2c.1.8.7 1.3 1.5 1.3h6.4c.8 0 1.4-.5 1.5-1.3L17.5 7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11v6M14 11v6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这份留痕？"
        message={
          deleteTarget?.archiveItemId
            ? `将永久删除「${deleteTarget.title}」，并同步删除馆藏中对应条目（含已藏忆）。`
            : `将永久删除「${deleteTarget?.title ?? ""}」，不可恢复。`
        }
        confirmLabel={deleting ? "删除中…" : "删除"}
        cancelLabel="留下"
        tone="danger"
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

export function ReflectReportGlass({
  reportId,
}: {
  reportId: string;
}) {
  const router = useRouter();
  const [report, setReport] = useState<{
    id: string;
    kind: string;
    title: string;
    body: string;
    archiveItemId: string | null;
    presentNote: string | null;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/ai/reflect/reports/${reportId}`);
      const data = (await res.json()) as {
        ok: boolean;
        report?: {
          id: string;
          kind: string;
          title: string;
          body: string;
          archiveItemId: string | null;
          presentNote: string | null;
        };
      };
      if (data.ok && data.report) setReport(data.report);
    })();
  }, [reportId]);

  async function act(action: "archive" | "keep" | "essay" | "delete") {
    if (!report) return;
    setPending(true);
    try {
      const res = await fetch(`/api/ai/reflect/reports/${report.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        essayId?: string;
        archiveItemId?: string;
      };
      if (!res.ok || !data.ok) {
        setNotice({ title: "操作失败", message: data.error || "请稍后重试" });
        return;
      }
      if (action === "delete") {
        router.push("/app/reflect?view=traces");
        return;
      }
      if (action === "essay" && data.essayId) {
        router.push(`/app/present/essays/${data.essayId}`);
        return;
      }
      if (action === "archive") {
        setReport({
          ...report,
          archiveItemId: data.archiveItemId ?? report.archiveItemId,
        });
        setNotice({
          title: "已归档",
          message: "报告已进入昔时往馆藏（默认未藏忆）。",
        });
      }
      if (action === "keep") {
        setReport({
          ...report,
          archiveItemId: data.archiveItemId ?? report.archiveItemId,
        });
        setNotice({
          title: "已藏忆",
          message: "报告已进知识库，缩影之后可以读到它。",
        });
      }
    } catch {
      setNotice({ title: "操作失败", message: "请稍后重试" });
    } finally {
      setPending(false);
      setConfirmDelete(false);
    }
  }

  if (!report) {
    return <p className="oc-mirror__empty">映照中…</p>;
  }

  return (
    <div className="oc-mirror oc-mirror--reading">
      <div className="oc-mirror__veil" aria-hidden>
        <span className="oc-mirror__orb oc-mirror__orb--a" />
        <span className="oc-mirror__orb oc-mirror__orb--b" />
        <span className="oc-mirror__grain" />
      </div>
      <section className="oc-mirror__looking oc-mirror__looking--wide">
        <div className="oc-mirror__rim" aria-hidden />
        <div className="oc-mirror__glass">
          <header className="oc-mirror__read-head">
            <IconActionLink
              href="/app/reflect?view=traces"
              label="回到镜前"
              className="oc-mirror__back"
            >
              <IconArrowLeft size={15} />
            </IconActionLink>
            <h1 className="oc-mirror__read-title">{report.title}</h1>
            <p className="oc-mirror__sub">
              {report.kind === "dual" ? "对照留痕" : "照时留痕"}
            </p>
          </header>
          {report.presentNote ? (
            <p className="oc-mirror__note">此刻自述：{report.presentNote}</p>
          ) : null}
          <article className="oc-mirror__reading">{report.body}</article>
          <div className="oc-mirror__actions">
            <button
              type="button"
              className="oc-mirror__primary"
              disabled={pending}
              onClick={() => void act("essay")}
            >
              据此写随笔
            </button>
            <button
              type="button"
              className="oc-mirror__ghost"
              disabled={pending}
              onClick={() => void act("archive")}
            >
              {report.archiveItemId ? "已归档" : "归档到馆藏"}
            </button>
            <button
              type="button"
              className="oc-mirror__ghost"
              disabled={pending}
              onClick={() => void act("keep")}
            >
              归档并藏忆
            </button>
            {report.archiveItemId ? (
              <Link
                href={`/app/past/gallery/${report.archiveItemId}`}
                className="oc-mirror__ghost"
              >
                打开馆藏
              </Link>
            ) : null}
            <button
              type="button"
              className="oc-mirror__ghost"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              删除留痕
            </button>
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={confirmDelete}
        title="删除这份留痕？"
        message={
          report.archiveItemId
            ? `将永久删除「${report.title}」，并同步删除馆藏中对应条目（含已藏忆）。`
            : `将永久删除「${report.title}」，不可恢复。`
        }
        confirmLabel={pending ? "删除中…" : "删除"}
        cancelLabel="留下"
        tone="danger"
        pending={pending}
        onConfirm={() => void act("delete")}
        onCancel={() => {
          if (!pending) setConfirmDelete(false);
        }}
      />
      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? "提示"}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </div>
  );
}
