---
created: 2026-04-08T20:24:09.132Z
title: Onboarding welcome screen not showing for new accounts
area: ui
files:
  - src/pages/OnboardingFlow.tsx
  - src/components/RequireAuth.tsx
---

## Problem

Brielle logged in with a different email and the welcome/onboarding screen did not appear. Currently onboarding may be gated to specific accounts (e.g. trolley.ai emails only). It should display the first time ANY user logs in - including beta testers like Kevin's goop email and other non-trolley accounts.

## Solution

Check how onboarding completion is tracked (likely a flag in Supabase user metadata or a workspace record). Ensure the onboarding flow triggers for all first-time logins regardless of email domain, not just whitelisted accounts.
