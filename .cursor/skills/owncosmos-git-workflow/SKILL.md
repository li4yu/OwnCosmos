---
name: owncosmos-git-workflow
description: >-
  OwnCosmos git branching and commit workflow: develop integration branch,
  feature branches named dev01/dev02/..., MVP acceptance gate before commit,
  merge into develop, push develop+devXX (not main daily), Chinese commit
  messages, ignore docs and secrets. Use when finishing a Phase/feature,
  starting the next feature, committing, merging to develop, pushing, rewriting
  commit messages, or when the user mentions git 提交、推送、合并 develop、开分支、
  验收提交、提交信息、中文.
---

# OwnCosmos Git 工作流

本仓库专用。完成功能 / 开下一功能 / 提交合并时**必须**按本 skill 执行。

## 用户提交习惯（必须遵守）

维护者约定，agent **每次**提交/推送前核对：

1. **提交信息用中文**：可保留 `feat(phase-N):` / `docs(git):` 等英文 scope 前缀，说明正文必须是中文。
2. **批准「提交」= 三步**：本地 commit → 合并进 `develop` → 推送远程。无需用户再单独说「推送」。
3. **日常只推** `develop` + **当前** `devXX`；**不要**日常推 `main`（除非用户明文要求发版 / 同步 main / 推 main）。
4. **改写已推送提交信息**：仅当用户明确要求（如「改为中文重新提交」）时，才 amend / 改写历史，并用 `--force-with-lease`（禁止裸 `--force`）；改写影响哪些远程分支就只更新那些分支。
5. **不提交** `docs/`、密钥、`.env`（见下文「永不提交」）。

## 分支模型

| 分支 | 用途 |
|------|------|
| `main` | 主分支（稳定；不日常开发） |
| `develop` | 集成分支；功能完成后合并到此 |
| `dev01`, `dev02`, … | 功能分支；从 `develop` 检出，一次做完一个 Phase/功能 |

规则：

- 不在 `main` / `develop` 上直接堆功能开发（初始化除外）。
- 下一功能编号 = 已有 `devN` 最大 N + 1（两位：`dev01`…`dev09`…`dev10`）。
- **禁止**裸 `git push --force`；**禁止**改 git config；**禁止**跳过 hooks。
- `--force-with-lease` 仅用于用户明文要求的历史改写（见上「用户提交习惯」第 4 条）。

## 永不提交

`.gitignore` 已忽略，提交前仍须核对 `git status`：

- 整个 `docs/`（产品文档本地保留，不进仓库）
- 密钥与环境：`.env*`、`*.pem`、凭证、本地 DB 等（见仓库根 `.gitignore`）

若 status 出现上述文件，**不要** `git add` 它们。

## 初始化（仓库尚无 develop 时）

1. 确保存在 `main`（若当前是 `master` 且无提交或可安全改名，改为 `main`）。
2. 确认 `.gitignore` 存在且含 `docs/` 与敏感项。
3. 从 `main` 创建并推送跟踪（若有 remote）：

```bash
git checkout main
git checkout -b develop
```

4. 开第一个功能分支：

```bash
git checkout -b dev01
```

## 开启下一功能

用户说「开始 Phase N / 开下一个功能 / 新开分支」时：

0. **产品文档 → Schema 门闩（先于写码）**：先仔细阅读 PRD / 阶段规划 / 相关模块与联动说明，再列出本阶段表、字段及**跨表/跨阶段关联**草案，**等用户确认后再继续**。确认并落库后，须在 `docs/sql数据库表规范/` **按阶段写入/更新数据库规范文档**。未确认前禁止建表与落地 schema。详见 [AGENTS.md](../../AGENTS.md)「Schema gate」。
1. `git checkout develop`（有 remote 则 `git pull`）。
2. 列出本地/远程 `dev*`，取最大序号 + 1 → `devXX`。
3. `git checkout -b devXX`。
4. 告知用户：已切换到 `devXX`，开始该功能。

说明：第 0 步可与开分支的顺序灵活处理——可先开空分支再等确认，也可确认后再开分支；**写实现与迁移必须在确认之后**。

## 完成功能 → 提交 → 合并 develop → 推送远程（强制验收门）

用户说「功能做完了 / Phase 完成 / 提交合并」或 agent 判断当前 Phase 可交付时：

### 1) MVP 验收（先于任何 commit）

对照 [docs/PRD-第一版.md](../../docs/PRD-第一版.md) 与 [docs/实现阶段规划.md](../../docs/实现阶段规划.md) 当前 Phase 的验收要点，列出简短检查清单，请用户本地点验。

**在用户确认 MVP 测过之前：禁止 commit、禁止 merge、禁止 push。**

### 2) 询问是否可提交（原文门闩）

验收通过后，**必须询问用户**（可中英，语义等价即可）：

> MVP 测试验收已完成的话：是否可提交当前分支、合并到 develop，并推送到远程？

仅当用户明确肯定（如「可以提交」「确认提交」「允许提交」「是」）后继续。  
用户否定或未答：停止，不提交、不推送。

**约定：用户批准「提交」= 本地 commit + 合并 develop + 推送远程**（见第 5 步）。无需再单独说「推送」。

### 3) 提交当前功能分支

并行检查：

```bash
git status
git diff
git diff --staged
git log -5 --oneline
git branch --show-current
```

确认当前在 `devXX`（不是 `main`/`develop`）。

暂存时：

- `git add` 仅代码与应入库文件（如 `web/`、应用源码、根 `.gitignore` 等）。
- **不要** add `docs/`、`.env`、密钥。

提交信息：**必须用中文**（见「用户提交习惯」）；简洁、说明「为什么」：

```powershell
git commit -m @"
feat(phase-N): 中文简述动机或效果

"@
```

提交后 `git status` 确认干净。

### 4) 合并进 develop

```bash
git checkout develop
git merge devXX
```

优先常规 merge。若冲突：解决后完成 merge；日常推送仍用普通 push，**不要**裸 `--force`。

合并后告知：`devXX` 已合入 `develop`。

### 5) 推送到远程（批准「提交」时默认执行）

有 `origin` 时，在合并成功后**必须**推送（普通 push）。

**日常 Phase / 功能提交只推这两条，不要推 `main`：**

```bash
git push -u origin develop
git push -u origin devXX
```

| 分支 | 何时推送 |
|------|----------|
| `develop` + 当前 `devXX` | 每次用户批准「提交」后（默认） |
| `main` | **仅当**用户明确要求（如发版、同步 main、推 main）才合并/推送；日常不要动 |

推送失败时：报告错误，不要擅自改用 force；等待用户指示。

完成后告知：已推送到远程（列出分支名即可；勿暗示已更新 `main`，除非本轮真推了）。

### 6)（可选）自动开下一分支

若用户说「继续下一 Phase」或同一句话要求开下一个：

```bash
git checkout develop
git pull origin develop   # 有 remote 时
git checkout -b devYY   # YY = 下一序号
```

否则停在 `develop`，等用户指示再开分支。

## 提交信息约定

- **正文用中文**（可保留 `feat(phase-0):` / `feat(auth):` 等英文 scope 前缀）。
- 示例：`feat(phase-0): 搭建工程底座，接入双主题与 Drizzle 脚手架`；`feat(phase-1): 接入邮箱密码注册登录`。
- 不写无关文件进 diff；不提交 secrets。

## 安全红线

- 不更新 git config  
- 不裸 `git push --force`；`--force-with-lease` 仅当用户明文要求改写已推送历史  
- 不 `--no-verify`（除非用户明文要求）  
- 不把 `docs/` 或 `.env` 加入版本库  
