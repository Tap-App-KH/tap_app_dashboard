---
name: pr
description: Run all quality checks then prepare a pull request for Core Dashboard
---

# Pull Request Preparation — Core Dashboard

Run every step in order. Stop and report clearly if any step fails.

---

## 1. Format

npm run format

Auto-fixes Prettier issues in all ts/tsx files. Stage any changes this produces before moving on.

---

## 2. Lint

npm run lint

ESLint must pass with zero errors. Warnings are acceptable but flag them in the PR summary.

---

## 3. Typecheck

npm run typecheck

TypeScript strict mode, no emit. Must exit 0.

---

## 4. Unit + component tests

npm run test

---

## 6. Review diff

git diff HEAD
git status

Check for:
- Accidentally committed .env* files, secrets, or credentials
- Debug console.log statements left in application code (use logger.* instead)
- Files that belong in .gitignore
- Any TODO/FIXME that should be resolved before merging

---

## 7. Stage and commit (if not already committed)

Stage specific files — never git add -A blindly. Follow conventional commits:

| Prefix | When |
|---|---|
| feat: | New feature or page |
| fix: | Bug fix |
| refactor: | Code restructure, no behaviour change |
| test: | Adding or updating tests |
| docs: | Documentation only |
| chore: | Tooling, deps, config |
| perf: | Performance improvement |

No AI attribution lines in commit messages.

---

## 8. PR summary

Generate a PR description covering:

What changed
- Bullet list of files/features changed

Why
- Motivation, linked issue or feature request if applicable

Test plan
- Which test suites cover this change
- Any manual steps needed to verify

Potential impacts
- DB schema changes (new migrations?)
- Env vars added or renamed (update .env.local.example?)
- New routes added (update middleware.ts if auth is needed?)
- Cache behaviour changes (`unstable_cache` additions/removals?)
- Breaking changes for other features

---

Last Updated: 2026-04-19