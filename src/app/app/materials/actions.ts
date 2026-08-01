"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  collectFromArchive,
  collectFromEssay,
  collectFromPlan,
  createMaterialFromText,
  deleteMaterial,
} from "@/services/materials";

export async function createManualMaterialAction(body: string, title?: string) {
  const session = await requireSession();
  const result = await createMaterialFromText(session.user.id, { body, title });
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/materials");
  return { id: result.id };
}

export async function collectEssayMaterialAction(
  essayId: string,
  excerpt?: string,
) {
  const session = await requireSession();
  const result = await collectFromEssay(session.user.id, essayId, excerpt);
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/materials");
  return { id: result.id };
}

export async function collectArchiveMaterialAction(
  archiveItemId: string,
  excerpt?: string,
) {
  const session = await requireSession();
  const result = await collectFromArchive(
    session.user.id,
    archiveItemId,
    excerpt,
  );
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/materials");
  return { id: result.id };
}

export async function collectPlanMaterialAction(
  planId: string,
  excerpt?: string,
) {
  const session = await requireSession();
  const result = await collectFromPlan(session.user.id, planId, excerpt);
  if ("error" in result) return { error: result.error };
  revalidatePath("/app/materials");
  return { id: result.id };
}

export async function deleteMaterialAction(materialId: string) {
  const session = await requireSession();
  const ok = await deleteMaterial(session.user.id, materialId);
  if (!ok) return { error: "素材不存在" };
  revalidatePath("/app/materials");
  return {};
}
