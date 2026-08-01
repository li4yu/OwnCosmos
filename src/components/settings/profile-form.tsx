"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { displayInitial } from "@/lib/user-display";

type ProfileFormProps = {
  initialName: string;
  initialImage: string | null | undefined;
  initialBio: string | null | undefined;
  email: string;
};

export function ProfileForm({
  initialName,
  initialImage,
  initialBio,
  email,
}: ProfileFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [bio, setBio] = useState(initialBio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onPickFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    setClearImage(false);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("图片需小于 2MB");
      return;
    }
    setError(null);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("昵称不能为空");
      return;
    }

    setPending(true);
    try {
      let nextImage: string | null = clearImage ? null : image || null;

      if (pendingFile) {
        const body = new FormData();
        body.append("file", pendingFile);
        const res = await fetch("/api/upload/avatar", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error || "头像上传失败");
          return;
        }
        nextImage = data.url;
      }

      const { error: updateError } = await authClient.updateUser({
        name: trimmedName,
        image: nextImage,
        bio: bio.trim(),
      });
      if (updateError) {
        setError(updateError.message || "保存失败");
        return;
      }

      setImage(nextImage ?? "");
      setPendingFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setClearImage(false);
      if (fileRef.current) fileRef.current.value = "";
      setMessage("资料已保存");
      router.refresh();
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  const shown = preview || (!clearImage && image) || null;

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md flex-col gap-1.5">
      <p className="text-xs text-[var(--mist)]">
        邮箱（只读）
        <span className="mt-0.5 block text-sm text-[var(--paper)]">{email}</span>
      </p>

      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        昵称
        <input
          type="text"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="auth-field !py-1.5 text-sm"
          autoComplete="nickname"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--mist)]">头像</span>
        <div className="flex items-center gap-3">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shown}
              alt="头像预览"
              className="h-14 w-14 rounded-full border border-[var(--line)] object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--field-bg)] font-mono text-base text-[var(--paper)]">
              {displayInitial(name)}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="ui-btn-ghost ui-btn-sm w-fit cursor-pointer">
              选择图片
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {(shown || pendingFile) && (
              <button
                type="button"
                className="text-left text-xs text-[var(--mist)] hover:text-[var(--amber)]"
                onClick={() => {
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(null);
                  setPendingFile(null);
                  setClearImage(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                清除头像
              </button>
            )}
            <p className="text-[10px] text-[var(--mist)]/80">
              未上传显示昵称首字母 · JPG/PNG/WebP/GIF · 最大 2MB
            </p>
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        简介 / 签名（可选）
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="一句话介绍自己"
          className="auth-field resize-y !py-1.5 text-sm"
        />
      </label>

      {error ? (
        <p className="text-xs text-[#b54a4a]" role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-[var(--line)] bg-[var(--field-bg)] p-2.5">
          <p className="text-xs text-[var(--teal)]" role="status">
            {message}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => router.push("/app")}
              className="ui-btn-primary ui-btn-sm"
            >
              返回首页
            </button>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="ui-btn-ghost ui-btn-sm"
            >
              继续编辑
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="ui-btn-primary ui-btn-sm w-fit"
        >
          {pending ? "保存中…" : "保存资料"}
        </button>
      )}
    </form>
  );
}
