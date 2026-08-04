# 自宇 · My Own Cosmos

私人时序成长空间：以**昔时往 / 今时际 / 来日途 / 凝时**组织思绪、规划与专注，沉淀进馆藏，形成可回望的闭环。

当前产品冻结为 **V1.0**（Phase 0–18）：账号可信、四大时序与凝时、馆藏与复盘、富文本与本地插图、首页摘要与脉搏、设置导出等已可用。AI 语义检索等为后续阶段。

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 / 全栈 | Next.js 15（App Router）、React 19、TypeScript、Tailwind CSS |
| 鉴权 | Better Auth（邮箱密码；验证码 / 重置密码依赖 SMTP） |
| 数据 | PostgreSQL + Drizzle ORM |
| 编辑 | TipTap（流思笺富文本与本地插图） |
| 包管理 | pnpm |

## 本地启动

### 1. 环境

- Node.js 20+（建议 LTS）
- pnpm
- 可连的 PostgreSQL（本地 / Neon / Supabase 等）

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

顶栏时序：**首页 → 昔时往 → 今时际 → 来日途 → 凝时**（「自宇」为品牌，不承担导航）。

| 模块 | 主要内容 |
|------|----------|
| 首页 | 今日摘要、脉搏、快捷入口；使用说明见壳内指南 |
| 今时际 | 流思笺（每日 / 专题）、临期帖 |
| 来日途 | 规划、轮期、时间胶囊、日课 |
| 凝时 | 顺钟、逆漏、凝录 |
| 昔时往 | 拾忆馆藏、往迹廊、心绪鉴 |

主题切换在 **设置 → 外观**。站内使用说明：已登录为 `/app/guide`，访客为 `/guide`。

硬规则摘要：沉淀单向进馆藏（不回流可编辑本体）；抹除**规划归档**时会同步清除来日途「已完成」中对应计划。

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
src/db/           # Drizzle schema
drizzle/          # SQL 迁移
public/           # 静态资源与本地上传
scripts/          # 工具脚本
```

## 许可与说明

私人项目。环境变量与密钥勿提交；`.env.local` 仅本机使用。
