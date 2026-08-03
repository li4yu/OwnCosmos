import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { essayImage } from "@/db/schema";
import { extractEssayImageUrls } from "@/lib/rich-text";

function newId() {
  return randomBytes(16).toString("hex");
}

/** 按正文 HTML 同步 essay_image；只改库，不删磁盘文件 */
export async function syncEssayImagesFromBody(
  userId: string,
  essayId: string,
  htmlBody: string,
) {
  const urls = extractEssayImageUrls(htmlBody);
  await getDb()
    .delete(essayImage)
    .where(and(eq(essayImage.userId, userId), eq(essayImage.essayId, essayId)));

  if (urls.length === 0) return;

  const now = new Date();
  await getDb().insert(essayImage).values(
    urls.map((url, i) => ({
      id: newId(),
      userId,
      essayId,
      url,
      sortIndex: i,
      createdAt: now,
    })),
  );
}
