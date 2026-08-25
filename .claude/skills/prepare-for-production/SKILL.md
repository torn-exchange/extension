---
name: prepare-for-production
description: Get the userscript ready to publish (branch, lint, build, version bump, commit) when the user says "prepare for production", "prep for prod", "ready to ship", or similar, for this repo (te-helper userscript).
---

# Prepare for production

This repo has no CI/CD yet — publishing is manual: build `dist/te-helper.user.js` and copy/paste it into Greasyfork / Tampermonkey. This skill does everything up to that copy/paste step.

Run these steps in order. Stop and tell the user if any step fails — do not skip ahead.

## 1. Check git state

- `git status` — if there are uncommitted changes, tell the user what's dirty and ask whether to include them in this prep or stash them first. Do not silently discard anything.
- `git branch --show-current` — if the current branch is `main`, create a new branch off it before making any changes (see naming below). If already on a non-main branch, stay on it — don't create a second branch.

Branch naming: `release/vX.Y.Z` using the version this prep will bump *to* (read current version from `package.json`, compute the next one per the bump type below — patch by default, see step 4).

## 2. Lint

`npm run lint`

If it fails, fix the reported issues (or ask the user how to proceed) before continuing — don't bump the version or build on top of lint errors.

## 3. Build (pre-bump sanity check)

`npm run build`

Confirms the code compiles cleanly before touching the version number. If it fails, stop and report the errors.

## 4. Bump the version

Default to a **patch** bump unless the user's request says otherwise (e.g. "prepare for production, minor bump" → minor; mentions of breaking changes → ask, don't assume major).

- `npm run release:patch` / `release:minor` / `release:major` — each of these runs `npm version <bump>` (updates `package.json`, which `vite.config.ts` reads for the userscript `@version`) and then rebuilds `dist/te-helper.user.js`.
- Note `npm version` will itself try to create a git commit + tag by default. That's fine here since we're already on a dedicated release branch — just let it happen, don't pass `--no-git-tag-version`.

## 5. Verify the build output

Confirm `dist/te-helper.user.js` exists and its `@version` header (top of the file) matches the new `package.json` version. `dist/` is gitignored, so this file is never committed — it's the artifact to copy/paste manually.

## 6. Commit

`npm version` in step 4 already created a commit (`vX.Y.Z`) and a tag for the `package.json`/`package-lock.json` change. Check `git status`/`git log -1` to confirm. If there were other staged changes from step 1 that weren't part of that commit, commit them separately with a normal descriptive message (see the repo's commit-message conventions in recent `git log`).

## 7. Report back to the user

Summarize:
- Branch name and whether it was newly created
- Old version → new version
- Path to the built file: `dist/te-helper.user.js`
- Reminder that this still needs manual push + PR (or direct copy/paste to Greasyfork/Tampermonkey) — this skill stops after the local commit and does not push or open a PR

Do not `git push` or open a PR as part of this skill — that stays a manual, explicitly-confirmed step per the user's workflow.
