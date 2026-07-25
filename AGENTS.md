# OwnCosmos agent notes

## Git

When finishing a Phase/feature, starting the next feature branch, or committing/merging: follow project skill [.cursor/skills/owncosmos-git-workflow/SKILL.md](.cursor/skills/owncosmos-git-workflow/SKILL.md).

- Branches: `main` → `develop` → `dev01`, `dev02`, …
- Never commit without MVP acceptance + explicit user OK to submit
- User OK to「提交」= merge `develop` + push **only** `develop` + current `devXX`（不日常推 `main`）
- Commit messages in Chinese（可带 `feat(phase-N):` 前缀）— 见 skill「用户提交习惯」
- Never commit `docs/` or secrets (see `.gitignore`)

