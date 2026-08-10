import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { HoverTip } from "@/components/ui/hover-tip";
import { IconChevronRight } from "@/components/ui/icon-glyphs";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";

const SECTIONS = [
  {
    href: "/app/settings/appearance",
    name: "外观",
    tip: "主题色板；登录后写入账号并同步",
  },
  {
    href: "/app/settings/preferences",
    name: "偏好",
    tip: "随笔归档、通知回望与凝时默认",
  },
  {
    href: "/app/settings/companion",
    name: "伴读",
    tip: "桌宠形象、称呼语气与主动气泡",
  },
  {
    href: "/app/settings/account",
    name: "账号与安全",
    tip: "改密与注销",
  },
  {
    href: "/app/settings/export",
    name: "导出",
    tip: "开放内容与图表导出",
  },
] as const;

export default async function SettingsHubPage() {
  await requireSession();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader
        title="设置"
        eyebrow="SETTINGS"
        description="按类进入外观、偏好、伴读、账号与导出"
        backHref="/app"
        backLabel="返回首页"
      />

      <ul className="oc-hub">
        {SECTIONS.map((sec) => (
          <li key={sec.href}>
            <Link href={sec.href}>
              <div className="min-w-0">
                <h2 className="oc-scroll__title text-[1rem]">
                  <PoeticName name={sec.name} tip={sec.tip} nestInControl />
                </h2>
                <p className="oc-scroll__body line-clamp-1">{sec.tip}</p>
              </div>
              <HoverTip
                tip="进入"
                variant="hint"
                nestInControl
                className="inline-flex shrink-0"
              >
                <span className="text-[var(--amber)]" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </HoverTip>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
