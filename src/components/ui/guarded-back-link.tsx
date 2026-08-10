"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HoverTip } from "@/components/ui/hover-tip";
import { IconArrowLeft } from "@/components/ui/icon-glyphs";

type GuardedBackProps = {
  href: string;
  label?: string;
};

/**
 * 顶栏返回：有未保存更改时用主题小窗确认。
 * 与 EssayEditor 的 dirty 同步靠 window 自定义事件。
 */
export function GuardedBackLink({ href, label = "返回" }: GuardedBackProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const onDirty = (e: Event) => {
      const detail = (e as CustomEvent<{ dirty: boolean }>).detail;
      if (typeof detail?.dirty === "boolean") setDirty(detail.dirty);
    };
    window.addEventListener("owncosmos:essay-dirty", onDirty);
    return () => window.removeEventListener("owncosmos:essay-dirty", onDirty);
  }, []);

  function attempt() {
    if (dirty) {
      setOpen(true);
      return;
    }
    router.push(href);
  }

  return (
    <>
      <HoverTip tip={label} variant="hint" nestInControl className="inline-flex">
        <button
          type="button"
          onClick={attempt}
          className="oc-back"
          aria-label={label}
        >
          <IconArrowLeft size={15} />
        </button>
      </HoverTip>
      <ConfirmDialog
        open={open}
        title="离开编辑？"
        message="有未保存的更改，离开后将丢失。确定返回吗？"
        confirmLabel="离开"
        cancelLabel="继续编辑"
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          window.dispatchEvent(
            new CustomEvent("owncosmos:essay-dirty", {
              detail: { dirty: false },
            }),
          );
          router.push(href);
        }}
      />
    </>
  );
}
