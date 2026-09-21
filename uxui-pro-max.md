---
name: ui-ux-pro-max
description: Senior-level UI/UX playbook for building and polishing the shareholder trading dashboard (dark theme, Thai UI, mobile-first, finance data). Use whenever writing or changing any HTML/CSS/JS in dashboard/server.py — layouts, tables, charts, colors, states, responsiveness, accessibility, or number formatting. Apply BEFORE shipping any UI change.
metadata:
  author: metatrader5-project
  version: "1.0.0"
---

# UI/UX Pro Max — Trading Dashboard Playbook

A practical, opinionated UI/UX standard for the XAUUSD shareholder dashboard. This is a **stdlib `http.server`** app with inline HTML/CSS/JS + Chart.js from CDN — no framework, no build step, dark theme, Thai copy. Optimize for **non-technical shareholders reading on phones**.

## 0. Golden rules
1. **Clarity over cleverness.** A shareholder should understand "am I up or down, and by how much" in under 2 seconds.
2. **Mobile-first.** Most shareholders open this on a phone. Design at 360px width first, then enhance for desktop.
3. **No new dependencies.** stdlib + Chart.js (CDN) only. No pip packages, no npm.
4. **Every change gets self-reviewed against the checklist at the bottom before you call it done.**

## 1. Visual hierarchy
- One clear primary number per screen (net P/L / equity). Make it the largest thing.
- Group related info in cards; separate groups with whitespace, not heavy borders.
- Max ~3 font sizes on a view. Establish a scale and reuse it.
- Left-align text; **right-align all numbers** (so digits line up for scanning).

## 2. Color system (dark theme, finance-aware)
Use design tokens, not ad-hoc hex. Suggested palette (keep consistent with existing dashboard):
- Background layers: `#0d1117` (base) → `#161b22` (card) → `#21262d` (raised).
- Text: `#e6edf3` (primary), `#8b949e` (muted), `#484f58` (disabled).
- **P/L semantics:** profit `#3fb950` (green), loss `#f85149` (red), flat/neutral `#8b949e`.
- Phase accents already in use: v3 and v4 have distinct accents (e.g. teal `#14b8a6` for v4) — keep them distinct and consistent.
- **Colorblind safety:** never rely on green/red alone. Pair with sign (`+`/`−`), an arrow (▲/▼), or position. ~8% of men can't distinguish red/green.
- Maintain **≥4.5:1 contrast** for body text, **≥3:1** for large text/UI. Muted grey on dark card must still pass.

## 3. Typography
- System font stack for latin + a Thai-capable fallback: `-apple-system, "Segoe UI", "Noto Sans Thai", Tahoma, sans-serif`. Thai needs slightly more line-height (1.5–1.6) than latin.
- **Tabular numbers** for all figures: `font-variant-numeric: tabular-nums;` so columns don't jitter.
- Don't justify Thai text; left-align. Avoid ALL-CAPS on Thai.

## 4. Number & money formatting (critical for trust)
- Currency with sign + 2 decimals + thousands sep: `+$1,234.56` / `−$89.10`. Use a real minus `−` or keep `-`, but be consistent.
- Color the number by sign AND prefix the sign explicitly.
- Percentages: one decimal (`+12.3%`). Win rate as whole or one decimal.
- Show units (USD, lot, pts) once per column header, not on every cell.
- Timestamps: show **ICT** (the dashboard's display TZ = broker + 7) and label it if space allows. Relative time ("2 นาทีที่แล้ว") for "last updated".

## 5. Data tables (trade logs)
- Sticky header on scroll. Right-align numeric columns.
- Zebra striping is optional on dark; a subtle row hover (`background:#21262d`) aids tracking.
- **Mobile:** don't force a wide table to shrink into unreadable text. Either horizontal-scroll the table with a visible affordance, OR collapse each trade into a stacked card (side/lot/entry→exit/profit).
- Truncate long IDs (ticket) with tooltip/title. Keep the profit column always visible.
- Sort newest-first by default. Make the sort state obvious.

## 6. Charts (Chart.js)
- One message per chart. Label axes; format the y-axis with the same money formatter.
- Match series colors to semantics (equity line neutral/blue; P/L bars green/red by sign).
- Downsample dense data; don't plot thousands of points on a phone. Disable heavy animations on large datasets.
- Provide a text summary near the chart for those who won't parse it visually.

## 7. States (never leave a blank screen)
Design all four for every data view:
- **Loading:** skeleton or a lightweight spinner + "กำลังโหลด…".
- **Empty:** friendly explanation ("ยังไม่มีไม้ในช่วงนี้") — not a raw empty table.
- **Error:** plain-language message + what to do ("โหลดไม่สำเร็จ ลองรีเฟรช"). Never dump a stack trace to shareholders.
- **Stale:** if `account_status`/data is old, show "อัปเดตล่าสุด …" so they know freshness.

## 8. Responsiveness & layout
- Fluid grid; cards stack to 1 column under ~640px.
- Tap targets ≥ 44×44px. Phase buttons/tabs must be thumb-friendly.
- Respect safe areas; avoid content hidden behind mobile browser chrome.
- Test at 360px, 768px, 1280px.

## 9. Micro-interactions & feedback
- Every action gives immediate feedback (button press state, tab active state, refresh spinner).
- Transitions ≤200ms; honor `prefers-reduced-motion` (disable non-essential animation).
- Active tab/phase must be visually unmistakable (accent underline/fill + `aria-pressed`).

## 10. Accessibility (baseline)
- Semantic HTML (`<button>`, `<table>`, `<th scope>`, `<nav>`, headings in order).
- All interactive elements keyboard-focusable with a visible focus ring.
- `aria-pressed` on toggles/tabs; `aria-live="polite"` on the auto-updating P/L number.
- Don't convey meaning by color alone (see §2).

## 11. Trust & clarity (shareholder-specific)
- Be honest with losses — show red losses plainly; hiding them destroys trust.
- Label what a number means (realized vs floating vs balance vs equity). Ambiguous "P/L" confuses.
- Keep phase/version filters (v1–v4) clearly labeled with what each represents.
- Consistency across /live and /test in look, but make it obvious which one you're viewing.

## 12. Performance (stdlib constraint)
- Inline CSS/JS is fine but keep it lean; avoid reflow-heavy JS loops.
- Cache/`no-store` deliberately (fresh data endpoints already use `no-store`).
- Lazy-render long lists; cap rows rendered (existing code caps recent trades) and paginate/scroll.

---

## Pre-ship checklist (run every time)
- [ ] Primary number (P/L/equity) is the most prominent element and correctly signed+colored.
- [ ] Numbers right-aligned, tabular-nums, formatted with sign/commas/decimals/units.
- [ ] Works at 360px (mobile) — table scrolls or collapses to cards; tap targets ≥44px.
- [ ] Green/red never the only signal (sign or arrow present too); contrast ≥4.5:1.
- [ ] Loading / empty / error / stale states all handled with Thai copy.
- [ ] Active tab/phase state obvious + `aria-pressed`; auto-updating value has `aria-live`.
- [ ] Timestamps shown in ICT; "last updated" freshness visible.
- [ ] No new dependencies; Chart.js from CDN only; `prefers-reduced-motion` respected.
- [ ] /live (shareholder) verified by curling the endpoint and eyeballing counts/net.
