---
name: owncosmos-git-workflow
description: >-
  OwnCosmos git branching and commit workflow: develop integration branch,
  feature branches named dev01/dev02/..., MVP acceptance gate before commit,
  merge into develop, ignore docs and secrets. Use when finishing a Phase/feature,
  starting the next feature, committing, merging to develop, or when the user
  mentions git 提交、合并 develop、开分支、dev01、验收提交.
---

# OwnCosmos Git 工作流

本仓库专用。完成功能 / 开下一功能 / 提交合并时**必须**按本 skill 执行。

## 分支模型

| 分支 | 用途 |
|------|------|
| `main` | 主分支（稳定；不日常开发） |
| `develop` | 集成分支；功能完成后合并到此 |
| `dev01`, `dev02`, … | 功能分支；从 `develop` 检出，一次做完一个 Phase/功能 |

规则：

- 不在 `main` / `develop` 上直接堆功能开发（初始化除外）。
- 下一功能编号 = 已有 `devN` 最大 N + 1（两位：`dev01`…`dev09`…`dev10`）。
- **禁止** `git push --force`；**禁止**改 git config；**禁止**跳过 hooks。

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

1. `git checkout develop`（有 remote 则 `git pull`）。
2. 列出本地/远程 `dev*`，取最大序号 + 1 → `devXX`。
3. `git checkout -b devXX`。
4. 告知用户：已切换到 `devXX`，开始该功能。

## 完成功能 → 提交 → 合并 develop（强制验收门）

用户说「功能做完了 / Phase 完成 / 提交合并」或 agent 判断当前 Phase 可交付时：

### 1) MVP 验收（先于任何 commit）

对照 [docs/PRD-第一版.md](../../docs/PRD-第一版.md) 与 [docs/实现阶段规划.md](../../docs/实现阶段规划.md) 当前 Phase 的验收要点，列出简短检查清单，请用户本地点验。

**在用户确认 MVP 测过之前：禁止 commit、禁止 merge。**

### 2) 询问是否可提交（原文门闩）

验收通过后，**必须询问用户**（可中英，语义等价即可）：

> MVP 测试验收已完成的话：是否可提交当前分支并合并到 develop？

仅当用户明确肯定（如「可以提交」「确认提交」「是」）后继续。  
用户否定或未答：停止，不提交。

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

提交信息：简洁、说明「为什么」；遵循仓库已有风格；用 HEREDOC（PowerShell 可用 here-string 等价）：

```bash
git commit -m "$(cat <<'EOF'
feat(phase-N): short why-focused summary

EOF
)"
```

Windows PowerShell 示例：

```powershell
git commit -m @"
feat(phase-N): short why-focused summary

"@
```

提交后 `git status` 确认干净。

### 4) 合并进 develop

```bash
git checkout develop
git merge devXX
```

优先常规 merge。若冲突：解决后完成 merge，**不要**在未询问时强推。

合并后告知：`devXX` 已合入 `develop`。

### 5)（可选）自动开下一分支

若用户说「继续下一 Phase」或同一句话要求开下一个：

```bash
git checkout develop
git checkout -b devYY   # YY = 下一序号
```

否则停在 `develop`，等用户指示再开分支。

## 提交信息约定

- `feat(phase-0): ...` / `feat(auth): ...` 等 scope 清晰。
- 不写无关文件进 diff；不提交 secrets。

## 安全红线

- 不更新 git config  
- 不 `push --force`  
- 不 `--no-verify`（除非用户明文要求）  
- 不把 `docs/` 或 `.env` 加入版本库  
