# 自宇 · My Own Cosmos

私人时序成长空间：以**昔时往 / 今时际 / 来日途 / 凝时**组织思绪、规划与专注，沉淀进馆藏，形成可回望的闭环。

**V1.0**（Phase 0–18）基本功能已冻结。AI 段已落地：**RAG（P19）**、**伴读（P21）**、**随笔润色（P22）**、**自省镜台**及后续壳层增强；近程以稳固抽测与增强池 / P20 深化为主。

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 / 全栈 | Next.js 15（App Router）、React 19、TypeScript、Tailwind CSS |
| 鉴权 | Better Auth（邮箱密码；验证码 / 重置密码依赖 SMTP） |
| 数据 | PostgreSQL + Drizzle ORM |
| 向量 | Milvus（进知识库馆藏同步；对账表 `rag_document`） |
| AI | 通义（DashScope）+ LangChain.js：伴读、润色、自省 |
| 编辑 | TipTap（随笔富文本与本地插图） |
| 包管理 | pnpm |

## 本地启动

### 1. 环境

- Node.js 20+（建议 LTS）
- pnpm
- 可连的 PostgreSQL（本地 / Neon / Supabase 等）
- 可选：本机 Milvus（见 `docker-compose.milvus.yml`）与 `DASHSCOPE_API_KEY`（开 AI 时）

### 2. 安装与配置

```bash
pnpm install
cp .env.example .env.local
```

在 `.env.local` 中至少填写：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Postgres 连接串 |
| `BETTER_AUTH_SECRET` | 长随机串（如 `openssl rand -base64 32`） |
| `BETTER_AUTH_URL` | 本机一般为 `http://localhost:3000` |

可选：

- `CRON_SECRET`：空闲归档 Cron 鉴权（生产建议配置）
- `SMTP_*`：邮箱验证 / 重置密码发信；未配置时验证码会打到服务端控制台
- `AI_ENABLED` / `DASHSCOPE_API_KEY` / Milvus 相关：启用 RAG、伴读、润色、自省

### 3. 数据库迁移

```bash
pnpm db:migrate
```

优先用 `db:migrate`，避免只用 `db:push` 导致迁移记账不一致。

### 4. 开发服务

```bash
pnpm dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。  
访客页可注册 / 登录；登录后进入 `/app` 壳层。

可选：`pnpm db:create-test-user` 创建测试账号（见 `scripts/`）。

## 常用脚本

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 开发服务器 |
| `pnpm build` / `pnpm start` | 生产构建与启动 |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | 根据 schema 生成迁移 |
| `pnpm db:migrate` | 执行迁移 |
| `pnpm db:studio` | Drizzle Studio |

## 产品结构（登录后）

顶栏时序：**首页 → 昔时往 → 自省 → 今时际 → 来日途 → 凝时**（「自宇」为品牌，不承担导航）。  
界面雅名以 [`src/lib/modules.ts`](./src/lib/modules.ts) 与站内指南「雅名词典」为准（悬停可读一句说明）。

| 模块 | 二级 / 主要内容 |
|------|----------------|
| 首页 | 今日摘要、脉搏、快捷入口、时序跳转；使用说明见壳内指南 |
| 昔时往 | 馆藏、时间线、情绪复盘 |
| 自省 | 单页镜台：对镜 / 照时 / 对照 / 留痕 |
| 今时际 | 随笔（每日 / 专题）、临期提醒 |
| 来日途 | 规划、周期计划、时间胶囊、每日打卡 |
| 凝时 | 正向计时、倒计时、专注记录 |

主题切换在 **设置 → 外观**。站内使用说明：已登录为 `/app/guide`，访客为 `/guide`。

硬规则摘要：沉淀单向进馆藏（不回流可编辑本体）；抹除**规划归档**时会同步清除来日途「已完成」中对应计划；图片永不进知识库。

## 仓库与分支

```
main  →  develop  →  dev01, dev02, …
```

- 功能在 `devXX` 开发，验收后合入 `develop` 并推送 `develop` + 当前 `devXX`
- 日常不推 `main`（发版时再动）
- 本地产品文档在 `docs/`，**不进 git**（见 `.gitignore`）
- Agent 协作约定见根目录 [`AGENTS.md`](./AGENTS.md)

## 目录速览

```
src/app/          # App Router 页面（含 /app 壳层、/guide）
src/components/   # UI 与业务组件
src/services/     # 领域服务（随笔、规划、馆藏等）
src/ai/           # RAG / 伴读编排 / 润色 / 自省
src/db/           # Drizzle schema
drizzle/          # SQL 迁移
public/           # 静态资源与本地上传
scripts/          # 工具脚本
```

## 许可与说明

私人项目。环境变量与密钥勿提交；`.env.local` 仅本机使用。
