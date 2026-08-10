"use client";

import Link from "next/link";
import { useState } from "react";

type Corpus = "user" | "project";

type Hit = {
  id: string;
  score: number;
  text: string;
  title: string;
  sourceId: string;
  archiveItemId: string | null;
  archiveType: string;
  chunkIndex: number;
  mode: "hybrid" | "ilike";
};

type SearchOk = {
  ok: true;
  corpus: Corpus;
  hits: Hit[];
  elapsedMs: number;
  infraReady: boolean;
  embeddingModel: string;
};

type SearchErr = { ok: false; error: string };

type SseEvent =
  | { type: "start"; llmModel: string; corpus: Corpus; topK: number }
  | {
      type: "meta";
      meta: {
        corpus: Corpus;
        agent: string;
        hits: Hit[];
      };
    }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

export function RagRecallPanel() {
  const [corpus, setCorpus] = useState<Corpus>("user");
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [expect, setExpect] = useState("");
  const [pending, setPending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchOk | null>(null);
  const [answer, setAnswer] = useState("");
  const [agent, setAgent] = useState<string | null>(null);
  const [llmModel, setLlmModel] = useState<string | null>(null);

  async function runSearch() {
    setPending(true);
    setError(null);
    setResult(null);
    setAnswer("");
    setAgent(null);
    setLlmModel(null);
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corpus, query, topK }),
      });
      const data = (await res.json()) as SearchOk | SearchErr;
      if (!res.ok || !data.ok) {
        setError(!data.ok ? data.error : `HTTP ${res.status}`);
        return;
      }
      setResult(data);
    } catch {
      setError("请求失败，请确认已登录且服务在跑");
    } finally {
      setPending(false);
    }
  }

  async function runAnswer() {
    setStreaming(true);
    setPending(true);
    setError(null);
    setResult(null);
    setAnswer("");
    setAgent(null);
    setLlmModel(null);
    const started = Date.now();

    try {
      const res = await fetch("/api/ai/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corpus, query, topK }),
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
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!line) continue;
          let ev: SseEvent;
          try {
            ev = JSON.parse(line.slice(5).trim()) as SseEvent;
          } catch {
            continue;
          }
          if (ev.type === "start") {
            setLlmModel(ev.llmModel);
          } else if (ev.type === "meta") {
            setAgent(ev.meta.agent);
            setResult({
              ok: true,
              corpus: ev.meta.corpus,
              hits: ev.meta.hits,
              elapsedMs: Date.now() - started,
              infraReady: true,
              embeddingModel: "hybrid→llm",
            });
          } else if (ev.type === "delta") {
            setAnswer((prev) => prev + ev.text);
          } else if (ev.type === "error") {
            setError(ev.error);
          }
        }
      }
    } catch {
      setError("流式请求失败，请确认已登录且服务在跑");
    } finally {
      setStreaming(false);
      setPending(false);
    }
  }

  const expectTrim = expect.trim().toLowerCase();
  const matched =
    result?.hits.filter((h) => hitMatchesExpect(h, expectTrim)) ?? [];
  const recallHint =
    expectTrim && result
      ? matched.length > 0
        ? `期望命中：Top${result.hits.length} 中有 ${matched.length} 条匹配（非正式召回率）`
        : `期望命中：Top${result.hits.length} 中未匹配到期望内容`
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-1.5 text-[var(--paper)]">
          语料库
          <select
            className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            value={corpus}
            onChange={(e) => setCorpus(e.target.value as Corpus)}
          >
            <option value="user">user · 已进知识库馆藏 → 过往召回</option>
            <option value="project">project · 操作手册 → 产品用法</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[var(--paper)]">
          TopK
          <input
            type="number"
            min={1}
            max={30}
            className="w-16 rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value) || 5)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-[var(--paper)]">
        查询
        <textarea
          className="min-h-[72px] rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5"
          placeholder="例如：临期提醒是什么 / 我写过焦虑吗"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--paper)]">
        期望命中（可选）
        <input
          className="rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1.5"
          placeholder="馆藏 id、标题或正文关键词；用于粗看是否召回"
          value={expect}
          onChange={(e) => setExpect(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || !query.trim()}
          onClick={() => void runSearch()}
          className="rounded border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--paper)] disabled:opacity-50"
        >
          {pending && !streaming ? "检索中…" : "仅测试召回"}
        </button>
        <button
          type="button"
          disabled={pending || !query.trim()}
          onClick={() => void runAnswer()}
          className="rounded border border-[var(--teal)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--teal)] disabled:opacity-50"
        >
          {streaming ? "生成中…" : "检索并流式回答"}
        </button>
        {result || llmModel ? (
          <span className="font-mono text-xs text-[var(--mist)]">
            {result ? `${result.elapsedMs}ms · ` : null}
            {agent ? `agent=${agent} · ` : null}
            {llmModel ?? result?.embeddingModel}
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {recallHint ? (
        <p
          className={
            matched.length > 0
              ? "text-sm text-[var(--teal)]"
              : "text-sm text-[var(--danger)]"
          }
        >
          {recallHint}
        </p>
      ) : null}

      {(answer || streaming) && (
        <section className="rounded border border-[var(--teal)] bg-[var(--panel)] p-2.5">
          <p className="font-mono text-xs tracking-[0.14em] text-[var(--teal)]">
            ANSWER · stream{streaming ? " · …" : ""}
          </p>
          <div className="mt-1.5 whitespace-pre-wrap break-words text-sm text-[var(--paper)]">
            {answer || (streaming ? "…" : "")}
          </div>
        </section>
      )}

      {result ? (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.14em] text-[var(--teal)]">
            HITS · {result.hits.length} · corpus={result.corpus}
          </p>
          {result.hits.length === 0 ? (
            <p className="text-sm text-[var(--mist)]">无命中</p>
          ) : (
            result.hits.map((h, i) => {
              const ok = expectTrim ? hitMatchesExpect(h, expectTrim) : false;
              return (
                <article
                  key={`${h.id}-${i}`}
                  className={`rounded border p-2.5 ${
                    ok
                      ? "border-[var(--teal)] bg-[var(--panel)]"
                      : "border-[var(--line)] bg-[var(--panel)]"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-[var(--mist)]">
                    <span className="font-mono text-[var(--teal)]">#{i + 1}</span>
                    <span>score={h.score.toFixed(4)}</span>
                    <span>mode={h.mode}</span>
                    <span>type={h.archiveType || "-"}</span>
                    <span>chunk={h.chunkIndex}</span>
                    {ok ? <span className="text-[var(--teal)]">期望命中</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--paper)]">
                    {h.title || "(无标题)"}
                  </p>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-sans text-xs text-[var(--mist)]">
                    {h.text}
                  </pre>
                  {h.archiveItemId ? (
                    <Link
                      href={`/app/past/gallery/${h.archiveItemId}`}
                      className="mt-1 inline-block text-xs text-[var(--teal)] underline-offset-2 hover:underline"
                    >
                      打开馆藏
                    </Link>
                  ) : (
                    <p className="mt-1 font-mono text-xs text-[var(--mist)]">
                      source={h.sourceId}
                    </p>
                  )}
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function hitMatchesExpect(h: Hit, expectLower: string): boolean {
  if (!expectLower) return false;
  return (
    h.id.toLowerCase().includes(expectLower) ||
    h.sourceId.toLowerCase().includes(expectLower) ||
    (h.archiveItemId?.toLowerCase().includes(expectLower) ?? false) ||
    h.title.toLowerCase().includes(expectLower) ||
    h.text.toLowerCase().includes(expectLower)
  );
}
