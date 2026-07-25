import { ThemeToggle } from "@/components/theme-toggle";

const modules = [
  {
    name: "昔时往",
    en: "Past",
    tip: "过去沉淀库：已归档的思绪、规划与专注记录",
  },
  {
    name: "今时际",
    en: "Present",
    tip: "当下工作台：随笔与临近提醒",
  },
  {
    name: "来日途",
    en: "Future",
    tip: "未来的目标与日子",
  },
  {
    name: "凝时",
    en: "Focus",
    tip: "专注计时：把心神收在当下",
  },
] as const;

export default function Home() {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <header className="mb-16 flex items-center justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.2em] text-[var(--amber)]">
            MY OWN COSMOS
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[0.2em] text-[var(--paper)]">
            自宇
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-[var(--amber)] px-2 py-1 font-mono text-[10px] tracking-widest text-[var(--void)]">
            PHASE 0
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-10">
        <section>
          <p className="font-mono text-xs tracking-[0.18em] text-[var(--teal)]">
            TEMPORAL PERSONAL UNIVERSE
          </p>
          <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--mist)]">
            工程底座就绪。深空夜色与时光卡其可切换；数据库连接已预留。下一阶段接入账号。
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {modules.map((m) => (
            <article
              key={m.name}
              title={m.tip}
              className="rounded border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]"
            >
              <h2 className="text-xl tracking-[0.16em] text-[var(--paper)]">{m.name}</h2>
              <p className="mt-1 font-[family-name:var(--font-cormorant)] italic text-[var(--amber)]">
                {m.en}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--mist)]">{m.tip}</p>
            </article>
          ))}
        </section>

        <section className="rounded border border-dashed border-[var(--line)] p-4 font-mono text-xs leading-6 tracking-wide text-[var(--mist)]">
          <p>验收（Phase 0）</p>
          <ul className="mt-2 list-inside list-disc">
            <li>pnpm dev 可打开本页</li>
            <li>右上角可切换「深空夜色 / 时光卡其」</li>
            <li>刷新后主题仍保持（localStorage；入库在 Phase 2）</li>
          </ul>
        </section>
      </main>

      <footer className="mt-16 font-mono text-[10px] tracking-[0.16em] text-[var(--mist)]/70">
        OWN COSMOS · WEB · PHASE 0 SCAFFOLD
      </footer>
    </div>
  );
}
