# MajlisMate.ai — Frontend Improvement Plan

## Goal

Make the existing Next.js 15 / React 19 / TypeScript frontend production-grade **without changing the backend API contract**. All work happens inside `app/`, `components/`, `lib/` (client-side), `public/`, and config files. No new API routes, no new env vars, no server persistence.

---

## Current State (observed)

- `components/PlannerWorkspace.tsx` — **1400+ lines**, owns 25+ `useState`, 15+ localStorage `useEffect`s, the streaming `ask()` function, action parser, all 6 domain handlers, and JSX.
- `components/planner/WorkspacePanels.tsx` — **1059 lines**, holds `DashboardPanel`, `BudgetPanel`, `RsvpPanel`, `VendorsPanel` in one file.
- `app/page.tsx` — 1-line redirect to `/chat`. No landing page.
- `app/layout.tsx` — minimal; no `loading.tsx`, `error.tsx`, `not-found.tsx`.
- `app/globals.css` — **15068 lines** monolithic stylesheet (single CSS file with all design tokens already declared in `:root`).
- `next.config.ts` — has `reactStrictMode`, sw cache headers; **no security headers**, **no bundle analyzer**.
- Hooks exist (`useBudget.ts`, `useCalendar.ts`, `useChecklist.ts`, `useGuests.ts`, `useLiveVoice.ts`, `usePlannerProfile.ts`) but `PlannerWorkspace` still holds parallel state — hooks appear under-used.
- Components in `components/planner/components/`: `ChecklistTaskRow`, `LiveOrb`, `LiveVoiceSheet`, `NotificationToggle`, `RiskAlerts`, `VendorMessageSheet`, `VoiceLeds`, `VoiceSettings`, `Waveform`, `WeeklyBriefing`.
- `components/planner/MenuAssistant.tsx:96` — uses `messages.slice(1).slice(-3)` (silently drops first message, only shows last 3).
- `WorkspacePanels.tsx:824–829` — vendor compare silently caps at 3.
- `app/styles/planner-overrides.css`, `app/styles/live-voice.css` — module-style CSS files.
- Tests in `tests/`: `detectLanguage`, `extractAnswer`, `liveVoiceHighlights`, `prosody`, `pushToTalkHotkey`, `retrieval`, `stream`, `streamingTts`, `utils`, `voice`, `voiceLeds`. **No component tests, no a11y tests.**
- No Prettier, no bundle analyzer, no Storybook, no CI.

---

## Constraints

- **No backend API changes.** `/api/chat`, `/api/health`, `/api/vendors` stay as-is.
- **No new env vars** required for any phase.
- **All persistence stays in localStorage / IndexedDB** until backend persists.
- **No new top-level dependencies** unless absolutely required (each dependency added gets a justification in the PR).
- Existing PWA (`app/manifest.ts`, `public/sw.js`, `components/PwaRegister.tsx`) is preserved.
- Existing voice mode (`lib/voice/*`, `useLiveVoice.ts`) is preserved.

---

## Phasing Strategy

Six phases, ordered so each is independently shippable and unblocks the next. **Recommended order = numbering order.**

| Phase | Theme | Items | Est. effort |
|---|---|---|---|
| **1** | Architecture & refactor | 1–4, 29, 33, 38, 39 | L |
| **2** | UX polish & missing screens | 5–12, 19–22, 44, 46 | M |
| **3** | Accessibility & keyboard | 13–18, 45, 49, 50 | M |
| **4** | AI-UX & data import/export | 23–28, 30–32, 47, 48 | M |
| **5** | Mobile & PWA | 41–45 (already in 2/3) | S |
| **6** | Testing, DX, perf | 34–37, 39–40 (already in 1) | M |

Each phase ends with `npm run lint && npm run typecheck && npm run test && npm run build` passing.

---

## Phase 1 — Architecture & Refactor

**Goal:** Make the codebase safe to iterate on. After this phase, adding a feature touches one focused file instead of a 1400-line god component.

### 1.1 Split `PlannerWorkspace.tsx` into orchestrator + hooks

- Create `components/planner/hooks/usePlannerState.ts` — encapsulates all `useState` + the localStorage hydration/persistence effects (replaces PlannerWorkspace.tsx:271–437). Returns one object.
- Create `components/planner/hooks/useChat.ts` — wraps `ask()`, streaming reader, abort/cancel, action application (extracted from PlannerWorkspace.tsx:697–931).
- Create `components/planner/hooks/useChecklist.ts`, `useBudget.ts` (already exists — extend), `useGuests.ts` (already exists — extend), `useAppointments.ts`, `useVendors.ts` if missing.
- Audit `components/planner/hooks/useBudget.ts`, `useCalendar.ts`, `useChecklist.ts`, `useGuests.ts`, `usePlannerProfile.ts`: if they exist, **wire them in** and remove the parallel state in `PlannerWorkspace.tsx`.
- `PlannerWorkspace.tsx` becomes < 300 lines: imports hooks, passes data + callbacks to child panels.

### 1.2 Split `WorkspacePanels.tsx` into per-panel files

New files:
- `components/planner/panels/DashboardPanel.tsx`
- `components/planner/panels/BudgetPanel.tsx`
- `components/planner/panels/RsvpPanel.tsx`
- `components/planner/panels/VendorsPanel.tsx`
- `components/planner/panels/ChecklistPanel.tsx` (if not separate)
- `components/planner/panels/CalendarPanel.tsx` (if not separate)
- `components/planner/panels/index.ts` re-exports

Each panel takes typed props; no prop sprawl (>15 props is a smell — split into domain-grouped sub-objects).

### 1.3 Create `useLocalStorageState<T>` hook

`hooks/useLocalStorageState.ts` — generic, JSON-encoded, SSR-safe (no-op on server). Replace the 15+ `useEffect` patterns in PlannerWorkspace.tsx:321–437. Also fixes the `messages` effect that calls `setCurrentChatId` during render (potential React 19 strict-mode loop).

### 1.4 Extract icons

`components/planner/icons/index.tsx` — moves `MenuIcon`, `RobotIcon`, `HistoryIcon`, `CloseIcon`, `TrashIcon` (currently in `PlannerWorkspace.tsx:78–164`) plus any icons in `WorkspacePanels.tsx`. Either as named React components OR as a single SVG sprite at `public/icons.svg` with `<svg><use href="/icons.svg#trash" /></svg>` references.

### 1.5 Dynamic-import heavy components

Use `next/dynamic` with `{ ssr: false, loading: <Skeleton /> }` for:
- `LiveVoiceSheet`
- `VoiceSettings`
- `VendorMessageSheet`
- `WeeklyBriefing`
- `RiskAlerts`

Target: shrink the chat-first initial JS bundle.

### 1.6 Add Prettier

- Add `prettier` to `devDependencies`.
- Create `.prettierrc.json` with project style (single quotes, semicolons, 100 cols — match existing).
- Add `"format": "prettier --write ."` and `"format:check": "prettier --check ."` scripts.
- Format the whole repo. Commit as a single chore PR.

### 1.7 Add bundle analyzer

- Add `@next/bundle-analyzer`.
- Wrap config in `next.config.ts`.
- Add `"analyze": "ANALYZE=true next build"` script.
- Capture baseline bundle sizes in the PR description.

**Phase 1 acceptance:** `PlannerWorkspace.tsx` < 300 lines, `WorkspacePanels.tsx` removed (logic moved), one `useLocalStorageState` hook replaces 15+ effects, `npm run build` reports a smaller chat-first bundle, Prettier passes.

---

## Phase 2 — UX Polish & Missing Screens

**Goal:** First-time users land on a real landing page, get an onboarding tour, can recover from errors, and can export their data.

### 2.1 Next.js route files

- `app/loading.tsx` — workspace skeleton (header + 6 tab placeholders + chat input).
- `app/error.tsx` — `'use client'` boundary with retry button, error digest shown.
- `app/not-found.tsx` — wedding-themed 404 with link back to `/chat`.
- `app/chat/loading.tsx` — chat-specific skeleton.

### 2.2 Landing page (`app/page.tsx`)

Replace the 1-line redirect with a real page:
- Hero: tagline + screenshot / mockup.
- Feature grid: chat, checklist, budget, vendors, voice, PWA.
- "Open planner" CTA → `/chat`.
- FAQ accordion.
- Footer with language toggle (BM / EN).
- Pure frontend; uses existing design tokens from `globals.css`.

### 2.3 Onboarding tour

`components/OnboardingTour.tsx`:
- 4 steps: Chat → Checklist → Budget → Vendors.
- Highlight target element with overlay, scroll into view, show tooltip.
- Persist `hasSeenOnboarding` in localStorage (`storageKeys.onboarding`).
- "Skip" + "Don't show again" options.
- Only shows if `checklistItems.length === 0 && budgetItems.length <= defaultBudgetItems.length && !hasSeenOnboarding`.

### 2.4 Light/dark mode

- Add `:root[data-theme="dark"]` overrides in `app/globals.css` (mirror the existing token palette).
- `components/ThemeToggle.tsx` — small button in the workspace header.
- Hook `useTheme()` reads `localStorage.theme`, sets `document.documentElement.dataset.theme`.
- Respect `prefers-color-scheme` on first load.
- Persist choice in localStorage.

### 2.5 Tab transition animations

- Add `.planner-panel-enter` class with fade + 6px translate-Y.
- Trigger on tab change in `PlannerWorkspace.tsx`.
- Respect `@media (prefers-reduced-motion: reduce)`.

### 2.6 Loading / empty / first-run states

For every panel (`DashboardPanel`, `BudgetPanel`, `RsvpPanel`, `VendorsPanel`, Checklist, Calendar):
- **Loading:** skeleton with placeholder cards.
- **First-run:** illustrated empty state with primary CTA ("Add your first guest").
- **Empty (filtered):** existing empty states, plus a "Clear filter" affordance.

### 2.7 Fix `MenuAssistant` conversation truncation

`components/planner/MenuAssistant.tsx:96` — replace `messages.slice(1).slice(-3)` with a scrollable message list showing all messages. Add a "View full chat →" button that switches to the main Chat tab.

### 2.8 Fix vendor compare UX

`WorkspacePanels.tsx:824–829` — show a tooltip / disabled visual state when the user tries to compare a 4th vendor, with the text "Compare up to 3 vendors". Make the limit visible.

### 2.9 CSV export for checklist + appointments

- `lib/planner/exportCsv.ts` — generic helper (`toCsv<T>(rows, columns)`).
- Add "Export CSV" buttons to Checklist and Calendar panels (mirror `BudgetPanel` at `WorkspacePanels.tsx:298` and `RsvpPanel` at `:615`).
- Add "Export all" → JSON dump of full planner state.

### 2.10 Print run sheet

- Add `@media print { ... }` rules in `app/styles/print.css`.
- New `app/print/page.tsx` shows: today's appointments, vendor contacts, guest headcount, top checklist items.
- Hide sidebar / chat in print view.

### 2.11 Share via URL

- `lib/planner/shareLink.ts` — encode planner state to base64 in URL hash (`#data=...`).
- "Share snapshot" button → encodes read-only state, copies link.
- On page load, detect hash, prompt "Import shared snapshot?" (replaces current state after confirmation).

### 2.12 Backup to / restore from file

- `lib/planner/backup.ts` — `exportBackup()` downloads a `.json` of all localStorage keys; `importBackup(file)` validates schema before applying.
- Buttons in Settings sheet.

### 2.13 PWA install prompt

- `components/PwaInstallPrompt.tsx` — listens for `beforeinstallprompt`, shows custom banner, persists dismissal in localStorage.

### 2.14 Locale-aware formatting

- New `hooks/useFormatLocale()` — returns `'ms-MY'` or `'en-MY'` based on `language` state.
- Replace hardcoded `'en-MY'` in `WorkspacePanels.tsx:161` and any other call sites.

### 2.15 Error boundary around chat

- `components/ChatErrorBoundary.tsx` — wraps `<ChatWidget />` in `PlannerWorkspace`. Logs error, shows "Chat error — retry" UI, doesn't blank the rest of the workspace.

**Phase 2 acceptance:** All Next.js route files exist, landing page renders, dark mode toggle works, onboarding shows on first visit, every panel has loading/empty/first-run states, CSV exports download, print view works.

---

## Phase 3 — Accessibility & Keyboard

**Goal:** Pass axe / Lighthouse a11y audits with zero critical violations.

### 3.1 Keyboard shortcut help

- New `components/ShortcutsDialog.tsx` — lists `Cmd+K`, `/`, `Esc`, `Enter`, `?`, `Cmd+Shift+T` (toggle theme).
- Triggered by `?` key.
- Already-wired `Cmd+K` lives in `PlannerWorkspace.tsx:447`; we wrap its handling in a shared `useShortcuts()` hook.

### 3.2 Focus management in sheets

For `VendorMessageSheet`, `LiveVoiceSheet`, `VoiceSettings`, `ChatHistorySheet`:
- Trap focus inside the sheet.
- On open: focus the first interactive element.
- On close: restore focus to the trigger.
- Add `aria-modal="true"` and `role="dialog"`.

`hooks/useFocusTrap.ts` — generic, used by all sheets.

### 3.3 `aria-live` for streaming chat

- In the chat message container, add `aria-live="polite"` and `aria-atomic="false"` so screen readers announce new tokens.
- Add `role="log"` to make intent explicit.

### 3.4 Skip-to-content link

- `app/layout.tsx` — add `<a href="#main" className="skip-link">Skip to main content</a>` as first focusable element.
- Style `.skip-link` to be visually hidden until focused.

### 3.5 Form validation feedback

For the budget add form (`WorkspacePanels.tsx:480–499`), guest add form (`:739–754`), and appointment form:
- Add `aria-describedby` on each input pointing to its error `<p>`.
- Show inline error messages when validation fails (empty required field, invalid number).
- Hook into native form validation OR write a small `useFieldValidation` hook.

### 3.6 Color contrast audit

- Run `npx @axe-core/cli http://localhost:3000/chat` against the running dev server.
- Fix any critical / serious violations.
- Document in the PR a list of color changes.

### 3.7 Tooltips on icon-only buttons

- Audit every button whose only child is an SVG.
- Add `aria-label` and `title` consistently.
- Optional: use a lightweight `Tooltip` component for non-essential tooltips.

### 3.8 `tabIndex` on chat scroll anchor

`PlannerWorkspace.tsx:267` — `messagesEndRef` div gets `tabIndex={-1}` and `aria-label="Chat end"` so screen readers can manage focus on long messages.

**Phase 3 acceptance:** axe / Lighthouse a11y score ≥ 95; all sheets keyboard-navigable; skip link works; streaming chat announces.

---

## Phase 4 — AI-UX & Data Layer

**Goal:** Make the chat feel smarter and the data easier to manage, **without** changing `/api/chat`.

### 4.1 Client-side intent preview

- In `components/ui/Composer.tsx`, on keystroke (debounced 200ms), check `wantsChecklist`, `wantsAppointment`, `wantsBudgetSuggestion`, `wantsGuestPlanning`, `wantsVendorMessage` (already in `utils.ts`).
- Show quick-action chips above the input: `+ Add to checklist`, `+ Add appointment`, `+ Suggest budget`.
- Clicking a chip doesn't submit; it pre-fills the next-step prompt.

### 4.2 Inline feedback buttons on AI messages

- `components/MessageFeedback.tsx` — 👍 / 👎 buttons rendered alongside each assistant message in `ChatWidget.tsx`.
- Stores `{ messageId, rating, content, timestamp }` in localStorage (`storageKeys.messageFeedback`).
- Shows toast "Feedback saved".
- Future-friendly: ready to wire to backend later.

### 4.3 Auto-suggest checklist deadlines

- `lib/planner/deadlines.ts` — given `majlisDate`, compute suggested deadlines for common checklist items based on `daysUntil(majlisDate)`.
- Render suggestions as ghost items in `ChecklistPanel` that the user can accept (one click).

### 4.4 Auto-suggest missing budget categories → vendors

- In `BudgetPanel`, when a category is missing (e.g. no "Photography"), show a "Suggested vendors" card linking to `/chat?tab=vendors&category=Photography` (using URL params to pre-filter the vendor panel).

### 4.5 Guest group auto-categorization

- `lib/planner/guestHeuristics.ts` — given a name string, guess group (Bride / Groom / Family / Friend / Work / VIP) using simple keyword + casing rules.
- Used during CSV import + manual add (suggest, don't auto-assign).

### 4.6 Currency formatting based on profile

- Extend `PlannerProfile` with optional `currency: 'MYR' | 'SGD' | 'IDR' | 'USD'`.
- `utils.ts:money()` reads profile currency; falls back to MYR.
- Add a `<select>` in the onboarding / settings sheet.

### 4.7 Memoize expensive selectors

- In every panel, wrap derived lists (`filteredBudgetItems`, `filteredGuests`, `filteredVendors`) in `useMemo`.

### 4.8 Virtualize long lists

- `react-window` or `@tanstack/react-virtual` for: guest list, checklist items, vendor cards, activity feed.
- Only kicks in when list > 50 items.

### 4.9 `data-` attributes for analytics

- Add `data-event="..."` on every action button (`add_guest`, `add_budget`, `shortlist_vendor`, `send_chat`).
- A single dispatcher in `lib/analytics.ts` — currently a no-op; ready to wire to PostHog / Plausible later.

### 4.10 Pre-cache retrieval (frontend only — refactor prep)

- `lib/retrieval-cache.ts` — in-memory `Map<string, KnowledgeDoc[]>` keyed by question hash, 5-minute TTL.
- Wired in `app/api/chat/route.ts` in a later phase; this phase just creates the module + tests.

**Phase 4 acceptance:** Composer shows intent chips; feedback buttons work; deadline suggestions appear; lists stay smooth at 1000+ items; every action button has a `data-event`.

---

## Phase 5 — Mobile & PWA Polish

**Goal:** First-class mobile experience.

### 5.1 Bottom sheet UX on mobile

- Refactor `LiveVoiceSheet` and `VendorMessageSheet` to use a `<dialog>` or custom bottom sheet with snap points (`min(33vh)`, `min(66vh)`, `100vh`).
- Drag handle, swipe-to-dismiss.
- Pure CSS + minimal JS (`pointer-events` + transform).

### 5.2 Sticky composer on mobile

- `components/ui/Composer.tsx` — `position: sticky; bottom: 0` on small screens.
- Account for iOS keyboard via `visualViewport`.

### 5.3 Pull-to-refresh

- `components/PullToRefresh.tsx` — wraps the chat list, triggers a re-stream of last assistant response on pull (uses existing chat history in localStorage).
- Threshold: 80px pull.

### 5.4 Reduce motion

- Add global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` in `app/globals.css`.

**Phase 5 acceptance:** App passes mobile Lighthouse audit (perf + a11y ≥ 90); composer stays visible above keyboard; pull-to-refresh works.

---

## Phase 6 — Testing, DX, Perf

**Goal:** Prevent regressions; make iteration fast.

### 6.1 Component tests

- Add `@testing-library/react` and `@testing-library/user-event` to devDependencies.
- New `tests/components/BudgetPanel.test.tsx` — renders rows, filters by tab, "Bayar penuh" updates paid.
- New `tests/components/RsvpPanel.test.tsx` — filters by tab, expand row, remove guest.
- New `tests/components/PlannerWorkspace.test.tsx` — hydrates from localStorage, renders default message.
- New `tests/hooks/useLocalStorageState.test.ts` — round-trip, SSR no-op, malformed JSON fallback.

### 6.2 Visual regression

- Add `@playwright/test` (already used elsewhere if present).
- Snapshot tests for `DashboardPanel`, `BudgetPanel`, `RsvpPanel`, `VendorsPanel` (one happy-path state each).
- Wire to GitHub Actions (separate work — see 6.7).

### 6.3 ESLint rules

- `react-hooks/exhaustive-deps` — would have caught missing deps in the 15+ localStorage effects.
- `import/order` — keep imports consistent.
- `@typescript-eslint/consistent-type-imports`.

### 6.4 Bundle size tracking

- Add `bundlesize` or use Next.js's built-in `@next/bundle-analyzer` output as a CI check (warn if first-load JS > 250 KB).

### 6.5 Storybook

- Add Storybook 8 (`storybook` script, `.storybook/` config).
- Story per existing component: `Composer`, `Markdown`, `ChecklistTaskRow`, `LiveOrb`, `NotificationToggle`, `RiskAlerts`, `VendorMessageSheet`, `VoiceLeds`, `VoiceSettings`, `Waveform`, `WeeklyBriefing`, panels.
- Per-panel "Kitchen Sink" story with all states populated.

### 6.6 CI

- Add `.github/workflows/ci.yml`:
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run format:check`
  - `npm run build`
  - (optional) `npm run test:e2e` against a built preview.

### 6.7 Security headers

- `next.config.ts` — add `headers()` returning:
  - `Content-Security-Policy` (start with report-only, tighten over time)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: microphone=(self), camera=()`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`

### 6.8 PWA assets

- Generate proper app icons (currently `icon.svg` only) — `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`.
- Update `app/manifest.ts` references.

**Phase 6 acceptance:** CI runs on every PR; component tests cover the 4 main panels; Storybook builds; bundle-size budget enforced; security headers present.

---

## Cross-Cutting Concerns

### Design tokens

`app/globals.css` already declares tokens in `:root` (`--bg`, `--accent`, etc.). Centralize all component CSS to use these — no hardcoded hex. Phase 1 includes a sweep that flags inline color values.

### i18n

`textMs`/`textEn` pattern already exists on items. Phase 2 adds `components/planner/copy.ts` to centralize UI strings (currently scattered in `PlannerWorkspace.tsx`, `WorkspacePanels.tsx`, `VoiceSettings.tsx`, `MenuAssistant.tsx`). Future: swap to `next-intl`.

### File size budget

After Phase 1, no file > 400 lines. Add an ESLint rule (`import/no-restricted-paths` + custom) or a CI check (`wc -l`).

### Dependencies to add (with justification)

| Package | Phase | Justification |
|---|---|---|
| `prettier` | 1 | Required for code formatting. |
| `@next/bundle-analyzer` | 1 | Built-in analyzer; no extra deps. |
| `react-window` | 4 | Pure CSS virtualized lists; tiny footprint. |
| `@testing-library/react` | 6 | Standard React component testing. |
| `@testing-library/user-event` | 6 | Realistic user interaction simulation. |
| `@playwright/test` | 6 | E2E + visual regression. |
| `bundlesize` (optional) | 6 | Bundle-size CI check. |
| `storybook` + addons | 6 | Component dev environment. |

### What is explicitly out of scope

- Backend changes (DB, auth, multi-tenant, admin) — covered by PROJECT_OVERVIEW.
- Streaming changes in `lib/aiNonymauz.ts` (we keep `stream: false` workaround).
- Vendor directory data updates.
- i18n beyond BM/EN.
- Migration to Tailwind / CSS Modules (could be a follow-up).

---

## Migration & Rollback Notes

- **Phase 1** is the riskiest (large refactor). Do it in a single PR OR split as: 1.3 + 1.6 first (safe), 1.1 + 1.2 second (bigger). The hooks refactor can be done panel-by-panel.
- **Phase 2.11 (share via URL)** introduces a new storage path — keep it opt-in via a button (no auto-load on mount).
- **Phase 2.12 (backup/restore)** writes to localStorage; add a confirmation modal before overwriting.
- **Phase 4.1 (intent preview)** is additive — disable via a feature flag if it causes noise.
- All phases: `git revert` of a single commit should restore the previous behavior. Avoid cross-phase commits.

---

## Open Questions for the User

1. **Storybook** — Worth the setup cost for an MVP? If yes, Phase 6.5. If no, drop and rely on component tests.
2. **Tailwind / CSS Modules** — The 15K-line `globals.css` will keep growing. Want a dedicated migration phase, or accept the current monolith?
3. **Backend-aware prep** — Items 4.10 (retrieval cache) and 6.4 (bundle budget) are foundation for future backend changes. Keep them in this plan or move to a separate "backend prep" plan?
4. **Dependencies** — Confirm `@tanstack/react-virtual` over `react-window` (modern, better TS support, slightly larger). I picked `@tanstack/react-virtual`.
5. **Phase order** — The recommended order is 1 → 6, but if you want to ship user-visible features first, swap Phase 2 and Phase 1 (refactor lands after the visible wins). Slightly more risk but faster feedback loop.

---

## Quick Reference — File Touch Map

| File | Phase | Action |
|---|---|---|
| `components/PlannerWorkspace.tsx` | 1 | Slim to < 300 lines |
| `components/planner/WorkspacePanels.tsx` | 1 | Delete; logic moved |
| `components/planner/panels/*.tsx` | 1 | Create |
| `components/planner/hooks/useLocalStorageState.ts` | 1 | Create |
| `components/planner/hooks/usePlannerState.ts` | 1 | Create |
| `components/planner/hooks/useChat.ts` | 1 | Create |
| `components/planner/icons/index.tsx` | 1 | Create |
| `components/planner/copy.ts` | 2 | Create |
| `components/OnboardingTour.tsx` | 2 | Create |
| `components/ThemeToggle.tsx` | 2 | Create |
| `components/PwaInstallPrompt.tsx` | 2 | Create |
| `components/ChatErrorBoundary.tsx` | 2 | Create |
| `components/ShortcutsDialog.tsx` | 3 | Create |
| `components/MessageFeedback.tsx` | 4 | Create |
| `hooks/useTheme.ts` | 2 | Create |
| `hooks/useFormatLocale.ts` | 2 | Create |
| `hooks/useShortcuts.ts` | 3 | Create |
| `hooks/useFieldValidation.ts` | 3 | Create |
| `hooks/useFocusTrap.ts` | 3 | Create |
| `lib/planner/deadlines.ts` | 4 | Create |
| `lib/planner/guestHeuristics.ts` | 4 | Create |
| `lib/planner/shareLink.ts` | 2 | Create |
| `lib/planner/backup.ts` | 2 | Create |
| `lib/planner/exportCsv.ts` | 2 | Create |
| `lib/planner/retrieval-cache.ts` | 4 | Create (frontend only) |
| `lib/analytics.ts` | 4 | Create (frontend stub) |
| `app/page.tsx` | 2 | Replace redirect |
| `app/loading.tsx` | 2 | Create |
| `app/error.tsx` | 2 | Create |
| `app/not-found.tsx` | 2 | Create |
| `app/chat/loading.tsx` | 2 | Create |
| `app/print/page.tsx` | 2 | Create |
| `app/globals.css` | 1, 2, 5 | Add tokens, dark mode, print, reduce-motion |
| `app/styles/print.css` | 2 | Create |
| `app/styles/dark.css` | 2 | Create (or inline in globals) |
| `next.config.ts` | 6 | Add analyzer + headers |
| `.prettierrc.json` | 1 | Create |
| `.github/workflows/ci.yml` | 6 | Create |
| `package.json` | 1, 6 | Add deps + scripts |
| `tests/components/*.test.tsx` | 6 | Create |
| `tests/hooks/*.test.ts` | 6 | Create |
| `.storybook/` | 6 | Create |
| `public/icons.svg` | 1 | Create (sprite) |
| `public/icons/icon-192.png` etc. | 6 | Add |
| `app/manifest.ts` | 6 | Reference new icons |

---

## Execution Order (suggested PRs)

1. **PR 1:** Phase 1.6 (Prettier) — chore, no behavior change.
2. **PR 2:** Phase 1.3 (`useLocalStorageState`) — small, isolated win.
3. **PR 3:** Phase 1.4 (icons module).
4. **PR 4:** Phase 1.1 (refactor PlannerWorkspace) + 1.2 (split panels) — single large PR or split per-panel.
5. **PR 5:** Phase 1.5 (dynamic imports) + 1.7 (bundle analyzer) — measure win.
6. **PR 6:** Phase 2.1 (loading/error/not-found) — quick wins.
7. **PR 7:** Phase 2.2 (landing page).
8. **PR 8:** Phase 2.4 (dark mode) + 2.14 (locale).
9. **PR 9:** Phase 2.9 (CSV) + 2.10 (print) + 2.11 (share) + 2.12 (backup).
10. **PR 10:** Phase 2.3 (onboarding) + 2.6 (loading/empty states).
11. **PR 11:** Phase 3 (a11y) — sweep across all panels.
12. **PR 12:** Phase 4.1 (intent preview) + 4.2 (feedback buttons).
13. **PR 13:** Phase 4.3 + 4.4 + 4.5 + 4.6 (smart suggestions).
14. **PR 14:** Phase 4.7 + 4.8 + 4.9 + 4.10 (perf + analytics prep).
15. **PR 15:** Phase 5 (mobile / PWA).
16. **PR 16:** Phase 6.1 + 6.3 (tests + lint).
17. **PR 17:** Phase 6.6 + 6.7 + 6.8 (CI + security + PWA assets).
18. **PR 18:** Phase 6.5 (Storybook) — optional.
19. **PR 19:** Phase 6.2 (visual regression) — optional.

---

## Definition of Done (per PR)

- `npm run lint && npm run typecheck && npm run test && npm run build` all pass.
- PR description includes: scope, screenshots / recordings, before/after for any visual change, before/after bundle size if UI is touched.
- At least one reviewer + the PR author both walk through the feature on a real device (mobile + desktop).
- Updated CHANGELOG.md (start one if not present) with a one-line entry per change.
