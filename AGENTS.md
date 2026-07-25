# OwnCosmos agent notes

## Schema gate（开功能前）

每次开始新 Phase / 新功能时，按顺序：

1. **先读产品规范**（至少）：[docs/PRD-第一版.md](docs/PRD-第一版.md)、[docs/实现阶段规划.md](docs/实现阶段规划.md)，以及本功能相关的模块说明（如联动、设置与账号、今时际、昔时往等）。设计表结构前禁止凭记忆开写。
2. **再**给出该阶段涉及的数据库表、字段、关系与索引草案（含 Better Auth 标准表若本阶段会落库）。
3. **等用户确认**（或修改意见）后，才开分支写实现、跑迁移。
4. 未确认前：禁止建表、禁止写业务 schema 落地代码。
5. **落库同时写规范文档**（本地 `docs/`，不进 git）：在 [docs/sql数据库表规范/](docs/sql数据库表规范/) 下按阶段新增/更新文档（如 `Phase-N-主题.md`），内容至少含：建表/变更流程、表与字段、关联、与产品规则对应关系。总览与本地连接见同目录 `00-总览与本地连接.md`。

### 跨表 / 跨阶段关联（会存在，必须显式设计）

产品生命周期会跨模块、跨 Phase（例如随笔 → 馆藏归档、计划 → 临期帖副本、用户 → 各业务表）。**多表关联是常态**，不是例外。

设计时必须：

- 对照产品文档里的联动规则（单向归档、副本、用户隔离等），再定 FK / 冗余字段 / 状态字段。
- 写明与**本阶段新建表**、**既有阶段已落库表**、以及**尚未建但文档已约定的远期表**之间的关系。
- 跨阶段引用已有表：标清「本表字段 → 既有表.字段」与删除策略。
- 跨阶段将影响尚未建的表：在草案中写「对后续 Phase 的接口/预留」，区分「本阶段就建列」vs「仅文档约定、下阶段再建」；不擅自加无用幽灵列，除非用户确认预留。

| 情况 | 做法 |
|------|------|
| 只引用已有表（FK） | 标明：本表字段 → 目标表.字段；级联/限制策略（如 `onDelete`） |
| 需改已有表（加列、改约束、新索引） | **单独列出「对已有表的变更」** + 产品依据；确认后才改 |
| 同阶段多表新建 | 关系要点 + 依赖顺序；先建被依赖方 |
| 关联尚未落库的后续表 | 标「跨阶段 / 下阶段」；说明本阶段是否预留字段 |
| 产品规则禁止的回流/混用 | 在草案中显式写出约束（如昔时往不回流可编辑本体） |

确认话术区分：**本阶段新建** / **改动旧表** / **跨阶段关联与预留**。

## 壳层约定（登录后）

- **主题切换只放在「设置 → 外观」**，不在各业务小模块顶栏重复放置。
- 未登录访客页（首页 / 登录小窗）可保留临时主题切换（仅 localStorage）。
- 右上角用户头像菜单：编辑资料、设置、其他功能（后续）、退出登录。

## Git

When finishing a Phase/feature, starting the next feature branch, or committing/merging: follow project skill [.cursor/skills/owncosmos-git-workflow/SKILL.md](.cursor/skills/owncosmos-git-workflow/SKILL.md).

- Branches: `main` → `develop` → `dev01`, `dev02`, …
- Never commit without MVP acceptance + explicit user OK to submit
- User OK to「提交」= merge `develop` + push **only** `develop` + current `devXX`（不日常推 `main`）
- Commit messages in Chinese（可带 `feat(phase-N):` 前缀）— 见 skill「用户提交习惯」
- Never commit `docs/` or secrets (see `.gitignore`)
