"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  plainToEditorHtml,
  sanitizeEssayHtml,
  stripToPlainText,
} from "@/lib/rich-text";

const EMOJIS = [
  "😀",
  "🙂",
  "😉",
  "😊",
  "😌",
  "🥰",
  "😢",
  "😭",
  "😤",
  "🤔",
  "😴",
  "✨",
  "🌙",
  "⭐",
  "🔥",
  "☕",
  "🍃",
  "🌸",
  "🌊",
  "📝",
  "💡",
  "🎯",
  "❤️",
  "💙",
] as const;

export type EssayRichEditorHandle = {
  getSelectedPlainText: () => string;
  getFullPlainText: () => string;
  /** 当前选区范围；无选区时返回 null */
  getSelectionRange: () => { from: number; to: number } | null;
  replaceSelectionWithPlain: (plain: string) => boolean;
  /** 按打开润色时记下的 from/to 写回（避免弹层抢焦点丢选区） */
  replaceRangeWithPlain: (
    from: number,
    to: number,
    plain: string,
  ) => boolean;
  replaceFullWithPlain: (plain: string) => void;
};

type EssayRichEditorProps = {
  name?: string;
  value: string;
  /** plain | html — plain 会转成段落 HTML 再编辑 */
  format?: string;
  placeholder?: string;
  onChange: (html: string) => void;
};

export const EssayRichEditor = forwardRef<
  EssayRichEditorHandle,
  EssayRichEditorProps
>(function EssayRichEditor(
  {
    name = "body",
    value,
    format = "html",
    placeholder = "写下此刻……",
    onChange,
  },
  ref,
) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const skipEmit = useRef(false);

  const initialHtml =
    format === "html" ? value || "" : plainToEditorHtml(value || "");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: { class: "oc-essay-img" },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml || undefined,
    editorProps: {
      attributes: {
        class: "oc-essay-editor__content",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (skipEmit.current) return;
      onChange(sanitizeEssayHtml(ed.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next =
      format === "html" ? value || "" : plainToEditorHtml(value || "");
    const current = sanitizeEssayHtml(editor.getHTML());
    if (sanitizeEssayHtml(next) === current) return;
    skipEmit.current = true;
    editor.commands.setContent(next || "", { emitUpdate: false });
    skipEmit.current = false;
  }, [value, format, editor]);

  useImperativeHandle(
    ref,
    () => ({
      getSelectedPlainText: () => {
        if (!editor) return "";
        const { from, to } = editor.state.selection;
        if (from === to) return "";
        return editor.state.doc.textBetween(from, to, "\n").trim();
      },
      getFullPlainText: () => {
        if (!editor) return stripToPlainText(value);
        return editor.getText({ blockSeparator: "\n\n" }).trim();
      },
      getSelectionRange: () => {
        if (!editor) return null;
        const { from, to, empty } = editor.state.selection;
        if (empty) return null;
        return { from, to };
      },
      replaceSelectionWithPlain: (plain: string) => {
        if (!editor) return false;
        const { empty } = editor.state.selection;
        if (empty) return false;
        const html = plainToEditorHtml(plain.trim());
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(html || "<p></p>")
          .run();
        onChange(sanitizeEssayHtml(editor.getHTML()));
        return true;
      },
      replaceRangeWithPlain: (from, to, plain) => {
        if (!editor) return false;
        const size = editor.state.doc.content.size;
        if (from < 0 || to > size || from >= to) return false;
        const html = plainToEditorHtml(plain.trim());
        editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, html || "<p></p>")
          .run();
        onChange(sanitizeEssayHtml(editor.getHTML()));
        return true;
      },
      replaceFullWithPlain: (plain: string) => {
        if (!editor) return;
        const html = plainToEditorHtml(plain.trim());
        skipEmit.current = true;
        editor.commands.setContent(html || "", { emitUpdate: false });
        skipEmit.current = false;
        onChange(sanitizeEssayHtml(editor.getHTML()));
      },
    }),
    [editor, onChange, value],
  );

  async function onPickImage(file: File | undefined) {
    if (!file || !editor) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/essay-image", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setUploadError(data.error || "上传失败");
        return;
      }
      editor.chain().focus().setImage({ src: data.url }).run();
      onChange(sanitizeEssayHtml(editor.getHTML()));
    } catch {
      setUploadError("上传失败，请稍后重试");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const htmlValue = editor
    ? sanitizeEssayHtml(editor.getHTML())
    : sanitizeEssayHtml(
        format === "html" ? value || "" : plainToEditorHtml(value || ""),
      );

  return (
    <div className="oc-essay-editor">
      <input type="hidden" name={name} value={htmlValue} />
      <input type="hidden" name="bodyFormat" value="html" />
      <div className="oc-essay-editor__toolbar" role="toolbar" aria-label="正文格式">
        <ToolbarBtn
          label="粗体"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarBtn
          label="斜体"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarBtn
          label="删线"
          active={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        />
        <span className="oc-essay-editor__sep" aria-hidden="true" />
        <ToolbarBtn
          label="列表"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolbarBtn
          label="编号"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarBtn
          label="引用"
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <span className="oc-essay-editor__sep" aria-hidden="true" />
        <ToolbarBtn
          label={uploading ? "上传中…" : "插图"}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        />
        <ToolbarBtn
          label="表情"
          active={emojiOpen}
          onClick={() => setEmojiOpen((v) => !v)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => void onPickImage(e.target.files?.[0])}
        />
      </div>

      {emojiOpen ? (
        <div className="oc-essay-editor__emoji" role="listbox" aria-label="表情">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className="oc-essay-editor__emoji-btn"
              onClick={() => {
                editor?.chain().focus().insertContent(e).run();
                if (editor) onChange(sanitizeEssayHtml(editor.getHTML()));
                setEmojiOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      ) : null}

      {uploadError ? (
        <p className="oc-essay-editor__err" role="alert">
          {uploadError}
        </p>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
});

function ToolbarBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`oc-essay-editor__btn${active ? " is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
