# FamBoard — Family Activity Tracker

## Overview

FamBoard is a **mobile-friendly web application** designed to help families track and manage children's activities. The first feature focuses on **Reading Time <> Screen Time**, where kids log reading minutes that can be redeemed as screen time, with parental approval at every step.

---

## Problem Statement

Parents want to encourage reading habits while managing screen time. Currently, tracking is manual (sticky notes, spreadsheets, verbal agreements) and prone to disputes. FamBoard provides a transparent, fun, and accountable system the whole family can trust.

---

## User Roles

| Role | Description |
|---|---|
| **Parent** | Creates and manages the family group. Approves/rejects reading-time submissions and screen-time redemptions. Can view dashboards and history for all family members. |
| **Kid** | Submits reading-time entries and requests screen-time redemptions. Can view their own balance and history only. |

---

## Authentication

### Phase 1 (MVP)
- **Simple email/password login** via **Supabase Auth** (built into Supabase's free tier — 50K MAU).
- **Disable email confirmation** in Supabase dashboard (Auth > Settings > toggle off "Enable email confirmations"). This is a family tool — we trust the parent who sets up accounts. This also avoids Supabase's strict email rate limits (3 emails/hour on free tier).
- **Session duration: 30 days**, rolling (auto-refreshes on each visit). Kids should almost never need to re-login. Security is intentionally relaxed — this is a family tool, not a bank.
- Family setup is done via **hidden URL pages** (not linked in navigation):
  - `/setup/create-family` — parent creates a family and becomes the admin.
  - `/setup/join-family/<invite-code>` — parent shares this URL with kids to join. The `invite-code` is a short, randomly generated code (e.g., 6 alphanumeric characters) separate from the family ID, to prevent unauthorized joins.
- **Role assignment:** When joining via the invite link, new members default to the **Kid** role. A parent can promote any member to the Parent role from Family Settings.
- **Invite code lifecycle:** The invite code is generated when the family is created. A parent can regenerate it from Family Settings (which invalidates the old one). No expiry for Phase 1.

### Phase 2
- **Google SSO (Gmail)** — enable Google OAuth in Supabase dashboard (no code changes needed).
- Proper onboarding flow with invite codes that expire.

---

## Core Feature: Reading Time <> Screen Time

### Concepts

| Term | Definition |
|---|---|
| **Reading Minutes** | Minutes a kid claims to have spent reading. Must be approved by a parent before they count. |
| **Screen Time Balance** | The approved reading minutes available for redemption as screen time. Computed on-the-fly: `balance = SUM(approved_reading) / redemption_rate - SUM(approved_redemptions)`. Not stored as a materialized field — this avoids sync issues and is fast enough for MVP. |
| **Redemption Rate** | Configurable by parent, **per-kid**. Default: **1 reading minute = 1 screen-time minute**. Parent can change per kid (e.g., 2:1 for a younger child, 1:1 for an older one). |

### Validation Rules

| Rule | Description |
|---|---|
| **Max reading per submission** | Capped at **180 minutes** per entry. Prevents accidental or inflated submissions. |
| **Balance check on redemption** | System checks available balance (excluding pending reading entries) before allowing a redemption request. |
| **No concurrent pending redemptions** | A kid cannot submit a new redemption while a previous one is still pending. This prevents over-spending the same balance. |
| **Idempotent approval** | If two parents approve/reject the same entry simultaneously, only the first action takes effect. Subsequent attempts show a "already reviewed" message. |

### User Flows

#### 1. Kid Submits Reading Time

1. Kid taps **"+ Log Reading"** button.
2. Fills in:
   - **Minutes read** (numeric input, max 180, with quick-select buttons: 15, 30, 45, 60).
   - **Book title** (optional free text).
   - **Notes** (optional — e.g., "chapter 5-7").
3. Submits -> entry is saved with status **Pending**.
4. Parent sees updated pending count badge on their dashboard.

#### 2. Parent Approves / Rejects Reading Time

1. Parent opens **Pending Approvals** section.
2. Sees list of pending entries with kid name, date, minutes, book title.
3. Taps an entry -> can **Approve** or **Reject** (with optional reason).
4. On approval -> minutes are added to the kid's Screen Time Balance.
5. On rejection -> kid can see the rejection reason in their activity feed.

#### 3. Kid Redeems Screen Time

1. Kid taps **"Use Screen Time"** button.
2. Sees their current available balance.
3. Enters or selects desired minutes to redeem (cannot exceed balance).
4. Submits -> entry saved with status **Pending**.
5. Parent sees updated pending count badge.

#### 4. Parent Approves / Rejects Screen Time Redemption

1. Parent opens **Pending Approvals** section.
2. Sees pending screen-time requests.
3. Taps an entry -> can **Approve** or **Reject** (with optional reason).
4. On approval -> minutes are deducted from the kid's Screen Time Balance.

#### 5. Kid Cancels a Pending Entry

1. Kid views a pending reading or redemption entry in their activity feed.
2. Taps **"Cancel"** -> entry status changes to **Cancelled**.
3. Only pending entries can be cancelled. Approved/rejected entries are immutable.

---

## Pages / Screens

### 1. Login Page
- Email / password form.
- App logo and tagline.
- Link to `/setup/create-family` for first-time parents.

### 2. Family Setup (hidden pages -- Phase 1)
- **`/setup/create-family`** — enter family name, parent registers with email/password -> creates the family, user becomes Parent.
- **`/setup/join-family/<invite-code>`** — user registers with email/password -> joins the family as Kid.

### 3. Dashboard (Kid View)
- **Screen Time Balance** — large, prominent number showing available minutes.
- **Recent Activity** — last 10 entries (reading submissions + redemptions, with status badges: Pending/Approved/Rejected/Cancelled).
- Quick-action buttons: **"+ Log Reading"** and **"Use Screen Time"**.

### 4. Dashboard (Parent View)
- **Family Overview** — card per kid showing name and current balance.
- **Pending Approvals** — count badge on the nav bar and a summary card on dashboard; tap to review.
- **Recent Family Activity** — unified feed across all kids.

### 5. Pending Approvals (Parent)
- Filtered list of all pending reading & redemption requests.
- Each card shows: kid name, type (reading/redemption), minutes, book title (if reading), submission date.
- Approve / Reject buttons on each card.

### 6. History
- Filterable by kid, date range, type (reading / screen time), status.
- Chronological log of all entries.
- Kid view: own entries only. Parent view: all family entries.

### 7. Family Settings (Parent only)
- **Family Name** — editable.
- **Members** — list with role, ability to remove or change role.
- **Invite Link** — display the join URL with invite code; button to regenerate code.
- **Redemption Rate** — adjust reading-to-screen-time ratio **per kid**.

---

## Database Schema

Full SQL schema with tables, indexes, RLS policies, and helper functions:
**[`supabase/migrations/00001_schema.sql`](supabase/migrations/00001_schema.sql)**

Seed data with sample users:
**[`supabase/seed.sql`](supabase/seed.sql)**

### Entity Relationship

```
families 1--* family_members *--1 auth.users
families 1--* reading_entries
families 1--* redemptions
family_members 1--* reading_entries (as kid)
family_members 1--* reading_entries (as reviewer)
family_members 1--* redemptions (as kid)
family_members 1--* redemptions (as reviewer)
```

### Tables Summary

| Table | Purpose |
|---|---|
| `families` | Family group (name, invite_code) |
| `family_members` | Links auth.users to a family with role + per-kid redemption_rate |
| `reading_entries` | Reading time submissions (minutes, book, status, review) |
| `redemptions` | Screen time redemption requests (minutes, status, review) |
| `kid_balances` (view) | Computed balance per kid: `earned - used` |

### Row-Level Security

All tables have RLS enabled. Key rules:
- **Kids** see/modify only their own entries
- **Parents** see/modify all entries within their family
- Membership is scoped by `auth.uid()` -> `family_members.user_id`
- `family_id` is denormalized on entries for RLS query performance

---

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Mobile-first** | Designed for phone screens first, responsive up to tablet/desktop. |
| **Performance** | Pages load in < 2 seconds on 4G. |
| **Accessibility** | WCAG 2.1 AA compliance (contrast, tap targets >= 44px). |
| **Data Privacy** | Kids' data handled with extra care. Minimal PII stored. No analytics tracking on kid accounts. |
| **Offline** | Phase 1: show "you're offline" banner. Phase 2: cached balance + queued submissions. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React + TypeScript — lightweight SPA, mobile-first responsive design |
| **UI** | Tailwind CSS + shadcn/ui components |
| **Routing** | React Router |
| **Auth** | Supabase Auth (email/password for Phase 1; Google OAuth toggle in Phase 2) |
| **Database** | Supabase (PostgreSQL) + `@supabase/supabase-js` client |
| **Hosting** | Vercel (pairs well with Supabase, simple deploy from Git) |
| **Notifications** | In-app badge count (MVP) / Web Push API (Phase 2) |

---

## MVP Scope (Phase 1)

> [!IMPORTANT]
> Phase 1 focuses on the core loop: log -> approve -> redeem -> approve.

- [ ] Simple email/password login
- [ ] Create family (hidden URL page, generates invite code)
- [ ] Join family via invite code (hidden URL page, defaults to Kid role)
- [ ] Kid: submit reading time (max 180 min per entry)
- [ ] Parent: approve / reject reading time
- [ ] Kid: request screen-time redemption (with balance validation)
- [ ] Parent: approve / reject screen-time redemption
- [ ] Kid: cancel own pending entries
- [ ] Balance display on dashboard (computed on-the-fly)
- [ ] Parent: per-kid redemption rate setting
- [ ] Pending approvals badge on parent nav bar
- [ ] Basic history view with filters
- [ ] Family settings (members, invite link, rates)

### Out of scope for Phase 1
- Google SSO (use simple email/password for now).
- Expiring invite codes (use regeneratable codes instead).
- Push notifications (use in-app badge only).
- Offline support / PWA (show offline banner only).
- Multiple activity types beyond reading.
- Gamification (streaks, badges, leaderboards).
- Detailed analytics / charts.
- Edit/correction of approved entries (parent can work around by rejecting and having kid resubmit).

---

## Future Features (Phase 2+)

| Feature | Description |
|---|---|
| **Google SSO** | Upgrade login to Google OAuth 2.0 for seamless sign-in. |
| **Expiring Invites** | Invite codes that expire after a configurable duration. |
| **Push Notifications** | Real-time alerts for pending approvals. |
| **Entry Corrections** | Parents can adjust approved entry minutes after the fact. |
| **Gamification** | Streaks, badges, achievements for consistent reading. |
| **Multiple Activities** | Chores, homework, exercise — all redeemable. |
| **Analytics** | Weekly/monthly reading trends, charts for parents. |
| **Timer Mode** | Built-in reading timer so kids don't have to estimate. |
| **PWA / Offline** | Installable app with offline queuing. |

---

## Success Metrics

| Metric | Target |
|---|---|
| Daily active family members | >= 80% of registered family |
| Average reading submissions per kid per week | >= 5 |
| Approval turnaround time | < 4 hours |
| Kid-reported satisfaction | "Fun to use" rating >= 4/5 |

---

*Document version: 2.0 — 2026-03-14*
