import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  DEFAULT_SEARCH_TOP_K,
  getEmbeddingModel,
  getHybridWeights,
  isRagInfraReady,
} from "@/ai/config";
import {
  semanticSearchProject,
  semanticSearchUser,
} from "@/ai/search";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type Body = {
  corpus?: "user" | "project";
  query?: string;
  topK?: number;
};

/** Phase 19: 语义检索（登录用户；关 AI 时用户库降级 ILIKE） */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }

  const corpus = body.corpus === "project" ? "project" : "user";
  const query = typeof body.query === "string" ? body.query : "";
  const topK =
    typeof body.topK === "number" && body.topK > 0 && body.topK <= 30
      ? Math.floor(body.topK)
      : DEFAULT_SEARCH_TOP_K;

  if (!query.trim()) {
    return NextResponse.json({ ok: false, error: "query 不能为空" }, { status: 400 });
  }

  const started = Date.now();
  const hits =
    corpus === "project"
      ? await semanticSearchProject(session.user.id, query, topK)
      : await semanticSearchUser(session.user.id, query, topK);

  const [denseW, sparseW] = getHybridWeights();
  return NextResponse.json({
    ok: true,
    corpus,
    hits,
    elapsedMs: Date.now() - started,
    infraReady: isRagInfraReady(),
    embeddingModel: getEmbeddingModel(),
    hybridWeights: { dense: denseW, sparse: sparseW },
  });
}
