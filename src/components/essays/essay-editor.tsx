"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  archiveEssayAction,
  createEssayAction,
  deleteEssayAction,
  refineEssayAction,
  updateEssayAction,
  type EssayActionState,
} from "@/app/app/present/actions";
import { BorrowMemoryPanel } from "@/components/essays/borrow-memory-panel";
import { MoodPicker } from "@/components/tags/mood-picker";
import { TagField, type TagOption } from "@/components/tags/tag-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { PoeticName } from "@/components/ui/poetic-name";

type EssayEditorProps =
  | {
      mode: "create";
      allTags?: TagOption[];
      /** 写入专题随笔时传入 */
      folderId?: string | null;
      /** 离开/删除后返回 */
      returnHref?: string;
    }
  | {
      mode: "edit";
      essayId: string;
      initialTitle: string;
      initialBody: string;
      initialMood?: string | null;
      initialTagIds?: string[];
      allTags?: TagOption[];
      /** 刚从「创建并保存」跳转过来 */
      justCreated?: boolean;
      /** 缘想溯源：来日途计划 */
      sourcePlanLink?: { title: string; href: string } | null;
      returnHref?: string;
      /** 专题篇：无自动逾时沉淀 */
      topicEssay?: boolean;
    };

const initialState: EssayActionState = {};

function emitEssayDirty(dirty: boolean) {
  window.dispatchEvent(
    new CustomEvent("owncosmos:essay-dirty", { detail: { dirty } }),
  );
}

export function EssayEditor(props: EssayEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateEssayAction.bind(null, props.essayId)
    : createEssayAction;
  const returnHref =
    props.returnHref ??
    (props.mode === "create" && props.folderId
      ? `/app/present/essays/topics/${props.folderId}`
      : "/app/present/essays/daily");
  const topicEssay =
    (props.mode === "create" && Boolean(props.folderId)) ||
    (props.mode === "edit" && Boolean(props.topicEssay));

  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(isEdit ? props.initialTitle : "");
  const [body, setBody] = useState(isEdit ? props.initialBody : "");
  const [mood, setMood] = useState(
    isEdit ? (props.initialMood ?? "") : "",
  );
  const [tagIds, setTagIds] = useState<string[]>(
    isEdit ? (props.initialTagIds ?? []) : [],
  );
  const [allTags, setAllTags] = useState<TagOption[]>(props.allTags ?? []);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(
    () => isEdit && Boolean(props.justCreated),
  );
  const [wasPending, setWasPending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (props.mode !== "edit") return;
    emitEssayDirty(false);
    if (props.justCreated) {
      router.replace(`/app/present/essays/${props.essayId}`, { scroll: false });
    }
  }, [props, router]);

  useEffect(() => {
    setAllTags(props.allTags ?? []);
  }, [props.allTags]);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
      return;
    }
    if (!wasPending) return;
    setWasPending(false);
    if (state.error) return;

    setDirty(false);
    emitEssayDirty(false);

    if (!isEdit && state.createdId) {
      router.push(`/app/present/essays/${state.createdId}?saved=1`);
      router.refresh();
      return;
    }
    if (isEdit) setSavedFlash(true);
  }, [pending, wasPending, state.error, state.createdId, isEdit, router]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
    setSavedFlash(false);
    emitEssayDirty(true);
  }

  function requestLeave() {
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    router.push(returnHref);
  }

  async function confirmDelete() {
    if (!isEdit) return;
    setActionPending(true);
    setActionError(null);
    const result = await deleteEssayAction(props.essayId);
    if (result?.error) {
      setActionError(result.error);
      setActionPending(false);
      return;
    }
    emitEssayDirty(false);
    router.push(returnHref);
    router.refresh();
  }

  async function confirmArchive() {
    if (!isEdit) return;
    setActionPending(true);
    setActionError(null);
    const result = await archiveEssayAction(props.essayId);
    if (result?.error) {
      setActionError(result.error);
      setActionPending(false);
      return;
    }
    emitEssayDirty(false);
    router.push("/app/past/gallery/essay-sediment");
    router.refresh();
  }

  async function confirmRefine() {
    if (!isEdit) return;
    if (dirty) {
      setRefineOpen(false);
      setNotice({
        title: "请先保存",
        message: "有未保存更改。请先保存随笔，再提炼到来日途。",
      });
      return;
    }
    setActionPending(true);
    setActionError(null);
    const result = await refineEssayAction(props.essayId);
    if (result?.error || !result?.refinedPlanId) {
      setActionError(result?.error ?? "提炼失败");
      setActionPending(false);
      setRefineOpen(false);
      setNotice({
        title: "无法提炼",
        message: result?.error ?? "提炼失败",
      });
      return;
    }
    emitEssayDirty(false);
    setRefineOpen(false);
    router.push(`/app/future/plans/${result.refinedPlanId}?saved=1`);
    router.refresh();
  }

  const sourcePlanLink =
    isEdit && props.sourcePlanLink ? props.sourcePlanLink : null;

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        {!isEdit && props.folderId ? (
          <input type="hidden" name="folderId" value={props.folderId} />
        ) : null}
        {sourcePlanLink ? (
          <p className="text-sm text-[var(--mist)]">
            <PoeticName
              name="缘想"
              tip="针对计划随手写下的想法，已存成独立随笔"
            />
            自{" "}
            <Link
              href={sourcePlanLink.href}
              className="text-[var(--amber)] hover:underline"
            >
              {sourcePlanLink.title}
            </Link>
          </p>
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          标题
          <input
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className="auth-field"
            placeholder="给这条思绪起个名字"
            maxLength={120}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          正文
          <textarea
            name="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              markDirty();
            }}
            rows={14}
            className="auth-field min-h-[280px] resize-y leading-7"
            placeholder="写下此刻……"
          />
        </label>

        <MoodPicker
          value={mood}
          onChange={(next) => {
            setMood(next);
            markDirty();
          }}
        />

        <TagField
          allTags={allTags}
          selectedIds={tagIds}
          onChange={(ids) => {
            setTagIds(ids);
            markDirty();
          }}
          onTagsMutated={() => router.refresh()}
        />

        <BorrowMemoryPanel
          onInsert={(text) => {
            setBody((prev) => {
              const sep = prev.trim() ? "\n\n" : "";
              return `${prev}${sep}${text}`;
            });
            markDirty();
          }}
        />

        {state.error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {state.error}
          </p>
        ) : null}

        {actionError ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {actionError}
          </p>
        ) : null}

        {savedFlash && !dirty && !state.error ? (
          <p className="text-sm text-[var(--teal)]" role="status">
            已保存
          </p>
        ) : null}

        {dirty ? (
          <p className="font-mono text-[10px] tracking-wide text-[var(--mist)]">
            有未保存更改；离开页面前请先保存
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="ui-btn-primary !w-auto px-5">
            {pending ? "保存中…" : isEdit ? "保存" : "创建并保存"}
          </button>
          <button
            type="button"
            onClick={requestLeave}
            className="ui-btn-ghost px-4 py-2.5"
          >
            返回列表
          </button>
          {isEdit ? (
            <>
              <button
                type="button"
                disabled={actionPending}
                onClick={() => {
                  setActionError(null);
                  setRefineOpen(true);
                }}
                className="ui-btn-ghost px-4 py-2.5 text-[var(--amber)] hover:border-[var(--amber)]"
              >
                提炼
              </button>
              {!topicEssay ? (
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setArchiveOpen(true);
                  }}
                  className="ui-btn-ghost px-4 py-2.5 text-[var(--teal)] hover:border-[var(--teal)]"
                >
                  归档
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDeleteOpen(true);
                }}
                className="ui-btn-danger ml-auto px-4 py-2.5"
              >
                删除
              </button>
            </>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={leaveOpen}
        title="离开编辑？"
        message="有未保存的更改，离开后将丢失。确定返回列表吗？"
        confirmLabel="离开"
        cancelLabel="继续编辑"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          setDirty(false);
          emitEssayDirty(false);
          router.push(returnHref);
        }}
      />

      <ConfirmDialog
        open={refineOpen}
        title="提炼为计划？"
        message="将用当前标题与正文创建一条来日途计划（默认今天截止，可再改），并保留溯源到本随笔。确定提炼吗？"
        confirmLabel="提炼"
        cancelLabel="取消"
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setRefineOpen(false);
        }}
        onConfirm={() => {
          void confirmRefine();
        }}
      />

      {!topicEssay ? (
        <ConfirmDialog
          open={archiveOpen}
          title="归档这条随笔？"
          message="将沉淀入昔时往拾忆馆藏（随笔沉淀），今时际不再可编辑。确定归档吗？"
          confirmLabel="归档"
          cancelLabel="取消"
          pending={actionPending}
          onCancel={() => {
            if (!actionPending) setArchiveOpen(false);
          }}
          onConfirm={() => {
            void confirmArchive();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        title="删除这条随笔？"
        message="流动中的随笔将永久删除，无法恢复。确定删除吗？"
        confirmLabel="删除"
        cancelLabel="取消"
        tone="danger"
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? "提示"}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
