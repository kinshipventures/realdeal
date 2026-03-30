---
created: 2026-03-30T00:53:17.914Z
title: Fix Vercel auto-deploy from git push
area: tooling
files: []
---

## Problem

Vercel auto-deploy from git push to main stopped working. Latest deploys were 2 days old despite multiple pushes. Manual `vercel --prod` works but auto-deploy via git integration is broken. Also had pnpm version mismatch (lockfile v9 vs pnpm 10) causing build failures — fixed by regenerating lockfile.

The git integration webhook may be disconnected or the Vercel project may need re-linking.

## Solution

Check Vercel dashboard → Project Settings → Git → verify the repo connection is active. Re-link if needed. The pnpm lockfile issue is already fixed.
