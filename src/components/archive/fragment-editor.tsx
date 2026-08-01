"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  createFragmentAction,
  updateFragmentAction,
  type PastActionState,
} from "@/app/app/past/actions";
type FragmentEditorProps =
  | { mode: "create" }
  | {
      mode: "edit";
      itemId: string;
      initialTitle: string;
      initialBody: string;
      initialImageUrl: string | null;
    };

const initialState: PastActionState = {};

export function FragmentEditor(props: FragmentEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = props.mode === "edit";
  const boundUpdate = isEdit
    ? updateFragmentAction.bind(null, props.itemId)
    : null;
  const [state, formAction, actionPending] = useActionState(
    isEdit ? boundUpdate! : createFragmentAction,
    initialState,
  );
  const [navPending, startTransition] = useTransition();

  const [title, setTitle] = useState(isEdit ? props.initialTitle : "");
  const [body, setBody] = useState(isEdit ? props.initialBody : "");
  const [imageUrl, setImageUrl] = useState(
    isEdit ? (props.initialImageUrl ?? "") : "",
  );
  const [clearImage, setClearImage] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPickFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("图片需小于 5MB");
      return;
    }
    setClearImage(false);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    if (pendingFile) {
      setUploading(true);
      try {
        const bodyFd = new FormData();
        bodyFd.append("file", pendingFile);
        const res = await fetch("/api/upload/fragment", {
          method: "POST",
          body: bodyFd,
        });
        const data = (await res.json()) as {
          url?: string;
          key?: string;
          error?: string;
        };
        if (!res.ok || !data.url || !data.key) {
          setUploadError(data.error || "图片上传失败");
          return;
        }
        fd.set("imageUrl", data.url);
        fd.set("imageKey", data.key);
        setImageUrl(data.url);
      } catch {
        setUploadError("图片上传失败");
        return;
      } finally {
        setUploading(false);
      }
    } else if (clearImage) {
      fd.set("clearImage", "1");
    }

    startTransition(() => {
      formAction(fd);
    });
  }

  const shown =
    preview || (!clearImage && imageUrl) || null;
  const busy = actionPending || navPending || uploading;

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-1.5">
      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        标题（可选）
        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="auth-field !py-1.5 text-sm text-[var(--paper)]"
          placeholder="给这段回忆起个名字"
          maxLength={120}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        文字回忆
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="auth-field resize-y !py-1.5 text-sm leading-6 text-[var(--paper)]"
          placeholder="写一点当时的感受，或留下空白只放图…"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-[var(--mist)]">图片（可选，≤5MB）</p>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt="碎片预览"
            className="max-h-48 w-fit rounded border border-[var(--line)] object-contain"
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-btn-ghost ui-btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {shown ? "更换图片" : "选择图片"}
          </button>
          {shown ? (
            <button
              type="button"
              className="ui-btn-ghost ui-btn-sm"
              disabled={busy}
              onClick={() => {
                if (preview) URL.revokeObjectURL(preview);
                setPreview(null);
                setPendingFile(null);
                setClearImage(true);
                setImageUrl("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              移除图片
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {uploadError || state.error ? (
        <p className="text-sm text-[var(--danger, #c45)]">
          {uploadError || state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="submit"
          className="ui-btn-primary ui-btn-sm"
          disabled={busy}
        >
          {busy ? "保存中…" : isEdit ? "保存" : "收入馆藏"}
        </button>
        <Link
          href="/app/past/gallery/memory-fragment"
          className="ui-btn-ghost ui-btn-sm"
        >
          取消
        </Link>
      </div>
    </form>
  );
}
