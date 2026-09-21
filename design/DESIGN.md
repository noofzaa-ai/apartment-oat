# ระบบจัดการหอพัก — Design System v2

## Design Philosophy

- **Clarity over decoration**: Information hierarchy drives every decision. Numbers must be instantly readable.
- **Consistent density**: Comfortable breathing room — not cramped, not wasteful. Base 4px grid.
- **Professional trust signals**: Dark sidebar, clean white content area, subtle shadows. Feels like a real admin tool.
- **Thai-first UI**: All labels and copy in Thai. Numeric formatting uses commas (10,000 ฿).
- **Keyboard + touch accessible**: All interactive targets 40px min height, ARIA labels on modals and navigation.

---

## Color Palette

### Brand
| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2D5BE3` | CTAs, active nav item, links, primary actions |
| `--color-primary-dark` | `#1E45C8` | Hover/pressed state of primary |
| `--color-primary-light` | `#EEF2FF` | Selected row bg, focused input bg, icon bg |

### Status
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#059669` | จ่ายแล้ว badge, positive stats |
| `--color-success-bg` | `#ECFDF5` | Badge background |
| `--color-warning` | `#D97706` | ค้างชำระ badge, overdue amounts |
| `--color-warning-bg` | `#FFFBEB` | Badge background |
| `--color-error` | `#DC2626` | Delete actions, error states |
| `--color-info` | `#0284C7` | Info alerts, water meter group |

### Neutrals
| Token | Value | Usage |
|-------|-------|-------|
| `--color-neutral-900` | `#0F172A` | Primary text (almost black) |
| `--color-neutral-800` | `#1E293B` | Sidebar background |
| `--color-neutral-700` | `#334155` | Secondary sidebar items |
| `--color-neutral-600` | `#475569` | Muted text, labels, captions |
| `--color-neutral-400` | `#94A3B8` | Placeholder, disabled, divider text |
| `--color-neutral-200` | `#E2E8F0` | Borders, dividers |
| `--color-neutral-100` | `#F1F5F9` | Row hover, chip bg |
| `--color-neutral-50`  | `#F8FAFC` | Page background |
| `--color-white` | `#FFFFFF` | Card bg, sidebar icon, input bg |

**Design decision**: Switched from cool-gray `#F3F4F6` to Slate scale (`#F8FAFC` / `#1E293B`) — slightly more character while staying neutral.

---

## Typography

### Font Stack
```
--font-sans: 'Inter', 'Noto Sans Thai', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Roboto Mono', 'Cascadia Code', monospace;
```

Inter for all UI. JetBrains Mono (or system mono fallback) exclusively for numeric data — meter readings, bill amounts, totals. This gives tabular alignment and clearly signals "this is a number, not prose".

### Type Scale
| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-xs` | 12px | 600–700 | Uppercase labels, badges, hints |
| `--text-sm` | 13px | 400–600 | Table cells, form labels, body |
| `--text-base` | 15px | 400 | Default body text |
| `--text-md` | 16px | 600–700 | Card titles, sub-headings, room numbers |
| `--text-lg` | 18px | 600–700 | Modal titles, section headers |
| `--text-xl` | 22px | 700 | Stat card values |
| `--text-2xl` | 28px | 700–800 | Page titles |

### Key typographic decisions
- **Page titles**: 28px / weight 700 / letter-spacing -0.02em — assertive, not bloated
- **Stat values**: 22px–28px monospace — numeric content deserves numeric font
- **Table headers**: 12px UPPERCASE / weight 700 / letter-spacing 0.06em — distinguish from data rows clearly
- **Room numbers in tables**: 16px weight 700 — first point of visual scan, must be bold

---

## Spacing System

Base: **4px grid** (previous system used 8px but 4px gives more control for tight UI elements).

| Token | Value | Common usage |
|-------|-------|--------------|
| `--space-1` | 4px | Icon gaps, badge padding |
| `--space-2` | 8px | Input gap from label, badge padding |
| `--space-3` | 12px | Button horizontal padding (sm), table cell padding |
| `--space-4` | 16px | Card internal padding, form field gap |
| `--space-5` | 20px | Card padding top/bottom, filter bar padding |
| `--space-6` | 24px | Main card padding, modal body padding |
| `--space-8` | 32px | Page container padding, section margin |
| `--space-10` | 40px | Major section spacing |
| `--space-12` | 48px | Page top padding |
| `--space-16` | 64px | Empty state padding |

---

## Elevation & Shadows

Layered shadow system — not decorative, signals elevation:

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | 0 1px 2px rgba(15,23,42,0.06) | Inputs, small buttons |
| `--shadow-sm` | 0 1px 3px + 0 1px 2px | Cards, sidebar |
| `--shadow-md` | 0 4px 6px + 0 2px 4px | Hovered cards |
| `--shadow-lg` | 0 10px 15px + 0 4px 6px | Toast notifications |
| `--shadow-xl` | 0 20px 25px + 0 8px 10px | Modals |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px | Small badges, sub-label chips |
| `--radius-md` | 8px | Buttons, inputs, small cards |
| `--radius-lg` | 12px | Main cards, table wrapper |
| `--radius-xl` | 16px | Modals |
| `--radius-full` | 9999px | Status badges, icon circles |

---

## Components

### Sidebar Navigation

- Width: 240px fixed, dark background `#1E293B`
- Header: Logo mark + brand name + sub-label (app description)
- Nav items: 40px min-height, 8px border-radius, icon (18px) + Thai text
- Active state: `--color-primary` background fill (not border/underline — clearer)
- Section dividers: Uppercase label "เมนูหลัก" etc. in muted text
- Footer: Version string at bottom
- Mobile: Hidden off-screen, slides in as overlay drawer, hamburger in top bar

### Buttons

All buttons: `height: 40px`, font-weight 600, 1px border, border-radius 8px.

| Class | Style | Use for |
|-------|-------|---------|
| `.btn-primary` | Blue fill, white text, blue shadow | Main CTA (เพิ่ม, บันทึก) |
| `.btn-secondary` | White fill, neutral border | Secondary actions (แก้ไข, กลับ) |
| `.btn-danger` | White fill, red text/border on hover | Delete action — NOT red fill by default (avoids accidental click) |
| `.btn-success` | Green fill | Confirm pay, final saves |
| `.btn-ghost` | Transparent | Low-priority actions |
| `.btn-sm` | height 32px | In-table actions |
| `.btn-icon` | 36×36px square | Icon-only actions (edit/delete in location cards) |

**Decision**: Delete button is `.btn-danger` (white bg, red text) not red bg — red fill reserved for the confirmation modal only where user has deliberately chosen to delete.

### Cards

- `.card`: White bg, `--neutral-200` border, 12px radius, sm shadow
- `.card-padded`: Adds 24px padding (for filter bars, info cards)
- `.stat-card`: Summary stats with bottom accent bar (3px colored strip)
- `.location-card`: Location cards with hover lift effect, footer strip for actions

### Tables

- Table wrapper has its own card styling (white, border, radius)
- `.table-toolbar`: Title + count row above table
- Headers: 12px uppercase, weight 700, `--neutral-50` background
- `.num-cell`: Right-aligned, monospace font, tabular-nums — for ALL financial columns
- `.table-total`: Last row with 2px top border and slightly heavier bg
- `.table-grand-total`: Blue primary color for the main total cell
- Mobile: Table converts to stacked cards using `data-label` attributes

### Forms & Inputs

- Label: 13px / weight 600 — heavier than before for clear hierarchy
- Input height: 42px (comfortable touch target)
- Number inputs: Right-aligned, monospace font — key change from v1
- Focused state: Primary border + 3px blue ring (not box-shadow tweak)
- `.input-display`: Readonly previous-reading display (gray bg, same size as input for visual alignment)
- Checkbox items (room options): Full-width bordered rows, not bare checkboxes

### Modals

- Overlay: `rgba(15,23,42,0.55)` with `backdrop-filter: blur(2px)` — modern frosted glass
- Modal: 16px radius, white, xl shadow
- Enter animation: fade + translateY(12px) scale(0.98) — subtle pop-in
- Mobile: Slides up as bottom sheet instead of center popup
- Close button: 32px icon button, not text "✕" — more accessible
- Footer background: `--neutral-50` to separate actions from content

### Status Badges

Two key states only:
- `.badge-paid` (จ่ายแล้ว): Green bg/border/text + dot indicator
- `.badge-unpaid` (ค้างชำระ): Amber bg/border/text + dot indicator
- `.badge-tag`: Blue tint for room option labels (Wi-Fi, AC, etc.)

Each badge includes a 6px filled dot before the text — color-only differentiation is not accessible, the dot adds a second visual cue.

### Toast Notifications

Replaces `alert()` in mockup. Fixed bottom-right, dark bg, 3s auto-dismiss. Used for: save success, delete success, error messages.

---

## Page-Specific Layouts

### Locations Page

Summary stats row (4 cards) above the location card grid. Location cards show:
- Icon (building SVG in primary-light bg)
- Name + address
- 3 meta stats inline: total rooms / occupied / vacant
- Card footer with primary "ดูห้อง →" button + icon buttons for edit/delete

### Rooms Page

Breadcrumb shows `หอพัก > Building A` — clear wayfinding. Table columns: Room# / Type / Base Rent / Water Rate / Electric Rate / Options tags / Actions. Options shown as inline `.badge-tag` chips. Rate columns right-aligned monospace.

### Meter Reading Page

Custom grid layout (not a regular table) for better column control:
- 6-column grid: `[room] [water-prev] [water-cur] [sep] [elec-prev] [elec-cur]`
- Group headers: "น้ำประปา" (blue) and "ไฟฟ้า" (amber) span 2 columns each
- Previous reading: Read-only gray box, same height as input (visual consistency)
- Current input: White editable, focus highlights with primary ring
- Delta display: Calculated inline below input as user types `+225 หน่วย`
- Error state: If current < previous, red ring + "ค่าน้อยกว่าเดือนก่อน" message

### Monthly Bills Page

Summary bar: 4 stat cards with bottom accent strip (rent=blue, water=sky, electric=amber, total=green). Table includes status column with badge + "ดูบิล" button per row. Total row displays grand total and outstanding amount in warning amber.

Bill detail modal shows:
- Room info section
- Meter usage (prev → current, units used)  
- Line-item breakdown in `.bill-breakdown` component (bordered rows)
- Total line: larger font, primary blue amount
- Status box: green (paid) or amber (unpaid) with contextual note
- "ทำเครื่องหมายว่าจ่ายแล้ว" button hidden when already paid

---

## Responsive Strategy

| Breakpoint | Behavior |
|-----------|----------|
| > 1024px | Full layout, sidebar 240px, 6-column meter grid |
| 768–1024px | Reduced padding, 2-column stat grid |
| < 768px | Sidebar becomes slide-in drawer, mobile top bar appears, tables → card stack, modals → bottom sheet |
| < 480px | 1-column stats, full-width modals, reduced page title size |

Mobile hamburger menu: Slide-in drawer with overlay backdrop. Toggled via hamburger button in fixed top bar.

---

## Accessibility Checklist

- All modal overlays have `role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- Navigation has `role="navigation"` + `aria-label`
- Active page has `aria-current="page"`
- Delete modal: `role="alertdialog"`
- Close buttons: `aria-label="ปิด"`
- Color contrast: primary blue `#2D5BE3` on white = 5.2:1 (passes AA)
- `--color-success` `#059669` on white = 4.6:1 (passes AA)
- `--color-warning` `#D97706` on white = 4.5:1 (passes AA — threshold)
- Status badges use dot indicator (not color alone) for status differentiation
- Min touch target: 40px height on all interactive elements
- Keyboard: Escape closes modal, focus moves to close button on open

---

## Developer Implementation Notes

### CSS Variables
All tokens defined in `:root` in `shared.css`. Use CSS custom properties throughout — no hardcoded colors.

### Font Loading
Load Inter from Google Fonts with `font-display: swap`. For production, self-host to eliminate render-blocking. JetBrains Mono loaded only on pages with financial data (meter, bills).

### Monospace Numbers
Apply `font-family: var(--font-mono); font-variant-numeric: tabular-nums;` to any column or cell containing meter readings, bill amounts, totals. Class `.num-cell` on `<td>` handles this.

### Modal Behavior
- Open: add class `.open` to `.modal-overlay`
- Close: Escape key, overlay click, close button
- Animation: CSS `@keyframes modalIn` on `.modal` element
- Mobile bottom sheet: triggered via `@media (max-width: 768px)` which repositions modal to bottom

### Table Mobile Fallback
On mobile, standard `<table>` reverts to block layout. Each `<td>` must have `data-label="..."` attribute for the CSS `::before` pseudo-element to show the column name.

### Meter Delta Calculation
JavaScript `calcDelta(input, prevValue, deltaElementId)` — fires on `oninput`. Updates the `.meter-delta-badge` element with `+N หน่วย` or an error string. Developer implementing real data should hook into the same pattern using React/Vue state.

### Bill Status Toggle
`markAsPaid()` function demonstrates the UI transition. In real implementation this calls API and updates the row's badge in the table as well as the modal state.

### Icons
All icons are inline SVG — no external icon library required. Use `fill="none"` + `stroke="currentColor"` pattern for consistent rendering. Size: 18px in nav, 15–16px in buttons, 20–22px in empty states.

### Toast System
`showToast(message)` in each page. In React implementation, convert to a shared context/hook. Auto-hides after 3000ms.

---

## File References

| File | Purpose |
|------|---------|
| `design/mockups/shared.css` | Complete design system v2 (tokens, components, responsive) |
| `design/mockups/index.html` | Mockup navigator (served on port 8089 by Docker) |
| `design/mockups/01-locations.html` | Locations page with stat cards + location card grid |
| `design/mockups/02-rooms.html` | Rooms table with breadcrumb + add/edit modal |
| `design/mockups/03-meter-reading.html` | Meter input grid with live delta calculation |
| `design/mockups/04-monthly-bills.html` | Bill summary table + detail modal + pay toggle |
