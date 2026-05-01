---
name: push
description: Stage all changes, create commit, and push to remote (use with caution)
---

# Commit and Push — Core Dashboard

Stage all changes, commit with a conventional message, and push to remote.

---

## 1. Analyze Changes

Run in parallel:

git status
git diff --stat
git log -3 --oneline

---

## 2. Safety Checks

STOP and WARN if any of these are staged:

| Risk | Pattern |
|---|---|
| Env files with real values | .env, .env.production, .env.local (`.env.*.example` is fine) |
| Credentials | *.key, *.pem, id_rsa, credentials.json |
| Build artifacts | node_modules/, .next/, dist/ |
| Temp files | .DS_Store, *.swp, *.tmp |
| Real secrets in files | CRON_SECRET=, DATABASE_URL=postgres://... with real credentials, JWT_SECRET= with real value |

Project-specific keys to flag if they contain real values (not placeholders):
- MONITORING_DATABASE_URL, CRON_SECRET, JWT_SECRET, REFRESH_TOKEN_SECRET
- DO_SPACES_KEY, DO_SPACES_SECRET, RESEND_API_KEY
- DEPLOY_PASSWORD (should only exist in GitHub Secrets, never in files)

Also check:
- No console.log or console.error left in app/, lib/, hooks/ — use logger.* instead
- No unresolved merge conflict markers (`<<<<<<<`, =======, `>>>>>>>`)
- Warn if pushing directly to main with significant changes (suggest /pr instead)

---

## 3. Present Summary and Request Confirmation

Changes Summary:
- X files modified, Y added, Z deleted

Safety: [pass/warn list]
Branch: [name] → origin/[name]

Commit message draft:
  [type]([scope]): [summary]

Proceed? (yes / no)

Wait for explicit "yes" before staging or committing.

---

## 4. Stage Specific Files

Never use git add -A or git add . blindly. Stage by explicit path:

git add app/ lib/ hooks/ components/ types/ tests/ drizzle/ scripts/ .github/ *.mjs *.ts *.tsx

Exclude from staging:
- .env* (except *.example files)
- plans/ — planning docs are not shipped code
- .playwright-mcp/ — local MCP config

Run git status after staging to verify.

---

## 5. Write the Commit Message

Use conventional commits. No AI attribution lines.

| Prefix | When |
|---|---|
| feat: | New feature or page |
| fix: | Bug fix |
| refactor: | Code restructure, no behaviour change |
| test: | Adding or updating tests |
| docs: | Documentation only |
| chore: | Tooling, deps, config |
| perf: | Performance improvement |
| ci: | GitHub Actions / CI changes |

Scope is optional but encouraged for large codebases:
feat(ops-monitor):, fix(auth):, test(api-monitor):

One-liner is preferred. Add a body only if the WHY is non-obvious.

---

## 6. Commit and Push

git commit -m "$(cat <<'EOF'
[type]([scope]): [summary]
EOF
)"
git push
git log -1 --oneline --decorate

If push fails with non-fast-forward:
git pull --rebase && git push

If on a new branch with no upstream:
git push -u origin [branch]

---

## 7. Confirm Success

Report:
- Commit hash and message
- Branch → origin/branch
- Files changed summary

---

## When to Use /push vs /pr

| Situation | Use |
|---|---|
| Quick fix, already tested, pushing to main | /push |
| New feature, needs review, or touches auth/DB | /pr (runs full quality checks first) |
| Unsure | /pr — it's safer |

---

Last Updated: 2026-04-19