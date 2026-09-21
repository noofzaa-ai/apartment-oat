# Apartment Management App - Implementation Guide

## Design Delivery Summary

This document summarizes all design decisions, component patterns, and guidance for developers implementing the apartment management web app.

---

## 📋 Screens Designed

### 1. **Locations (หอพัก)** — 01-locations.html
Display and manage all apartment buildings/locations

**Key Features:**
- Card grid layout showing all locations
- Each card displays: name, room count, address
- Actions: Edit, Delete, View Rooms (navigate)
- Add Location modal with: name, address, phone

**Layout Pattern:**
- Sidebar (fixed) + Main content (flex)
- Page header with title + Add button
- Responsive grid: auto-fill minmax(280px, 1fr)

**Interaction Model:**
- Click "ดูห้อง →" to navigate to Rooms page
- Edit/Delete via modal dialogs
- Escape key or overlay click to close modals

---

### 2. **Rooms (ห้อง)** — 02-rooms.html
Manage rooms within a selected location

**Key Features:**
- Table view of all rooms with their properties
- Columns: Room#, Type, BaseRent, WaterRate, ElectricRate, Options, Actions
- Options displayed as colored badges (e.g., "Parking", "Wi-Fi 200")
- Add/Edit Room modal with:
  - Room number (disabled on edit)
  - Type (dropdown)
  - Base rent and meter rates
  - Checkboxes for optional services
  - Per-option pricing inputs

**Data Model Context:**
```
Room {
  id
  location_id
  room_number: string
  type: enum
  baseRent: number
  waterRate: number (per unit)
  electricRate: number (per unit)
  options: RoomOption[] {
    id
    type: 'parking' | 'aircon' | 'wifi'
    name: string
    price: number
  }
}
```

**Table Responsiveness:**
- Desktop: Full table
- Tablet: Reduce padding, stack optional columns
- Mobile: Convert to card stack (see README for approach)

---

### 3. **Meter Reading (อ่านมิเตอร์)** — 03-meter-reading.html
Monthly data entry for water and electricity readings

**Key Features:**
- Location selector (dropdown) → filters rooms
- Month selector (HTML5 input type="month")
- Grid layout showing previous readings (read-only) and current inputs
- Columns per meter type: Previous | Current | Unit indicator

**Critical Design Points:**
1. **Visual Separation**: Previous readings in light gray bg, current inputs editable
2. **Side-by-Side Layout**: Water | [separator] | Electric for scanning ease
3. **Previous Month Display**: Auto-populate or manual fetch from DB
4. **Validation**: Require at least one reading before save

**Data Model Context:**
```
MeterReading {
  id
  room_id
  month: date (YYYY-MM)
  waterMeterCurrent: number
  electricMeterCurrent: number
  created_at
  updated_at
}
```

**Calculation Logic (for bill generation):**
- Water consumption = currentWater - previousWater
- Electricity consumption = currentElec - previousElec
- These deltas × rates = usage charges

---

### 4. **Monthly Bills (บิลรายเดือน)** — 04-monthly-bills.html
Summary and breakdown of all charges per room per month

**Key Features:**
- Summary statistics (4 cards): Total Rent, Water, Electric, Grand Total
- Detailed table with breakdown per room
- Status indicators: "จ่ายแล้ว" (Paid) / "ค้างชำระ" (Unpaid)
- Room details modal showing:
  - Room info (type, location)
  - Usage details (meter delta, units consumed)
  - Full itemized breakdown
  - Payment status
- Export to PDF and Print buttons

**Bill Calculation Formula:**
```
Bill = baseRent 
     + (waterConsumption × waterRate)
     + (electricConsumption × electricRate)
     + sum(selectedOptions.price)
```

**Data Model Context:**
```
Bill {
  id
  room_id
  month: date
  baseRent: number
  waterCharges: number
  electricCharges: number
  optionsCharges: number (sum)
  totalAmount: number
  isPaid: boolean
  dueDate: date
  created_at
  updated_at
}
```

**Table Responsiveness:**
- All columns visible on desktop
- Hide optional columns on tablet
- Convert to cards on mobile

**Status Tracking:**
- Mark as paid: Button in details modal or inline toggle (optional)
- Show days overdue if applicable

---

## 🎨 Design System

### Color Palette (CSS Variables)

```css
--color-primary: #2563EB;        /* CTAs, active states */
--color-primary-dark: #1D4ED8;   /* Hover state */
--color-success: #10B981;        /* Success, positive actions */
--color-warning: #F59E0B;        /* Caution, unpaid bills */
--color-error: #EF4444;          /* Errors, deletions */
--color-info: #3B82F6;           /* Info messages */

--color-text-primary: #1F2937;   /* Main text */
--color-text-secondary: #6B7280; /* Secondary/disabled text */
--color-bg-primary: #FFFFFF;     /* Cards, content areas */
--color-bg-light: #F3F4F6;       /* Page background */
--color-bg-lighter: #F9FAFB;     /* Subtle backgrounds, table headers */
--color-border: #E5E7EB;         /* Borders, dividers */
```

### Typography

**Font Stack:**
```
'Inter', 'Segoe UI', 'Roboto', sans-serif
```

**Scale & Weights:**
| Level | Size | Weight | Example Usage |
|-------|------|--------|---------------|
| H1 | 2rem (32px) | 700 | Page titles |
| H2 | 1.5rem (24px) | 700 | Modal titles, section headers |
| H3 | 1.25rem (20px) | 600 | Card headers, subtitles |
| Body | 1rem (16px) | 400 | Main text, table cells |
| Small | 0.875rem (14px) | 400 | Form labels, secondary text |
| Tiny | 0.75rem (12px) | 400 | Hints, helper text |

**Line Heights:**
- Headings: 1.2
- Body: 1.6
- Inputs: 1.5

### Spacing System

**Base Unit: 8px** — All spacing should be multiples of 8

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight internal spacing |
| sm | 8px | Default padding/gap |
| md | 16px | Card padding, input padding |
| lg | 24px | Section spacing |
| xl | 32px | Large breaks |
| 2xl | 48px | Page margins |

### Components

#### Buttons
- **Dimensions**: Min 44px height (touch-friendly)
- **Padding**: 12px 24px
- **Border-radius**: 8px
- **Transition**: All 0.2s
- **States**:
  - Primary: Blue bg, white text, dark hover, shadow on hover
  - Secondary: Light gray bg, border, dark text
  - Danger: Red bg, white text
  - Disabled: Gray, 50% opacity, no pointer

#### Inputs & Selects
- **Padding**: 12px 16px
- **Border**: 1px solid light gray
- **Border-radius**: 8px
- **Focus**: Blue border + light blue shadow
- **Placeholder**: Light gray text
- **Read-only/Disabled**: Light gray bg

#### Cards
- **Padding**: 16px
- **Border**: 1px solid light gray (optional)
- **Border-radius**: 8px
- **Shadow**: Optional light shadow
- **Gap between items**: 8px (sm) or 16px (md)

#### Tables
- **Header bg**: Light gray `#F9FAFB`
- **Cell padding**: 12px
- **Row separator**: 1px light border
- **Hover**: Subtle light gray background
- **Total row**: Bold text, light gray bg

#### Forms
- **Layout**: Vertical (flex-direction: column)
- **Gap**: 16px (md) between form-groups
- **Label style**: Small (14px), bold, above input
- **Error**: Red border + red error message
- **Success**: Green border + green checkmark

#### Modals
- **Max-width**: 600px desktop, 95vw mobile
- **Background**: White, z-index 1000
- **Overlay**: Dark (rgba(0,0,0,0.5))
- **Close trigger**: Escape key or close button
- **Header/Footer**: Border-top/bottom 1px light gray

#### Badges
- **Style**: Inline pill with light bg and darker text
- **Padding**: 4px 12px
- **Border-radius**: 20px
- **Font-size**: 0.75rem
- **Colors**: Success (green), Warning (amber), Error (red)

---

## 📱 Responsive Design

### Breakpoints

```css
Mobile:   < 640px
Tablet:   640px - 1024px
Desktop:  > 1024px
```

### Mobile-First Approach

**Mobile (< 640px):**
- Single column layout
- Sidebar hidden → hamburger menu (optional, can stay collapsed)
- Full-width buttons
- Tables → card stack layout
- Modal: full width with padding
- Reduced font sizes and spacing

**Tablet (640px - 1024px):**
- Sidebar optionally visible (64px collapsed or 200px expanded)
- 2-column layout where needed
- Tables: reduce non-critical columns
- Modal: centered, 90% width

**Desktop (> 1024px):**
- Sidebar full width (256px)
- Multi-column layouts
- Full table with all columns
- Modal centered at 600px max

### Responsive Patterns

```html
<!-- Grid that stacks on mobile -->
<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
  <!-- cards -->
</div>

<!-- Form that stacks on mobile -->
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <!-- on mobile: grid-template-columns: 1fr; -->
</div>
```

### Media Query Strategy

```css
@media (max-width: 1024px) { /* Tablet adjustments */ }
@media (max-width: 768px)  { /* Mobile layout */ }
@media (max-width: 480px)  { /* Small phone tweaks */ }
```

---

## 🔧 Component Patterns for Developers

### Sidebar Navigation

**Structure:**
```html
<aside class="sidebar">
  <div class="sidebar-title">🏢 ระบบจัดการหอพัก</div>
  <nav class="sidebar-nav">
    <a href="#" class="sidebar-item active">หอพัก</a>
    <a href="#" class="sidebar-item">ห้อง</a>
    ...
  </nav>
</aside>
```

**Active State:**
- Apply `.active` class to current nav item
- Primary blue background

### Page Header

**Pattern:**
```html
<div class="page-header">
  <h1 class="page-title">หอพัก</h1>
  <div class="page-actions">
    <button class="btn btn-primary">+ เพิ่ม</button>
  </div>
</div>
```

### Card Grid

**Pattern:**
```html
<div class="card-grid">
  <div class="card">
    <div class="card-header">Title</div>
    <div class="card-content">
      <div class="card-item">
        <span class="card-label">Label</span>
        <span class="card-value">Value</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn btn-secondary btn-small">Edit</button>
      <button class="btn btn-danger btn-small">Delete</button>
    </div>
  </div>
</div>
```

### Table

**Pattern:**
```html
<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>Column</th>
        ...
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data</td>
        ...
      </tr>
      <tr class="table-total">
        <td><strong>Total</strong></td>
        ...
      </tr>
    </tbody>
  </table>
</div>
```

### Form

**Pattern:**
```html
<form class="form">
  <div class="form-group">
    <label for="input">Field <span class="required">*</span></label>
    <input type="text" id="input" required>
    <div class="form-error-message">Error message</div>
  </div>
  <div class="form-actions">
    <button type="button" class="btn btn-secondary">Cancel</button>
    <button type="submit" class="btn btn-success">Save</button>
  </div>
</form>
```

### Modal

**Pattern:**
```html
<div class="modal-overlay" id="myModal">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Title</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <!-- Content -->
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary">Cancel</button>
      <button class="btn btn-success">Save</button>
    </div>
  </div>
</div>
```

### Status Badge

**Pattern:**
```html
<span class="badge badge-success">จ่ายแล้ว</span>
<span class="badge badge-warning">ค้างชำระ</span>
<span class="badge badge-error">หมดอายุ</span>
```

---

## 🎯 Key Implementation Points

### 1. CSS Strategy

**Option A: Direct Use (Fastest)**
- Copy `shared.css` directly to project
- Modify file paths/URLs as needed
- Add component-specific CSS as needed

**Option B: CSS-in-JS (React)**
```jsx
// Convert shared.css to emotion/styled-components
const ButtonPrimary = styled.button`
  background-color: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border-radius: var(--border-radius);
  // ...
`;
```

**Option C: Tailwind CSS**
```js
// Update tailwind.config.js
module.exports = {
  theme: {
    colors: {
      primary: '#2563EB',
      success: '#10B981',
      // ...
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      // ...
    }
  }
};
```

### 2. Data Flow

**Locations Page:**
```
Load → GET /api/locations → Render cards
       Add/Edit/Delete via modal → POST/PUT/DELETE /api/locations
       Click room button → Navigate to Rooms page with location_id
```

**Rooms Page:**
```
Load with location_id → GET /api/locations/{id}/rooms → Render table
                        Add/Edit/Delete via modal → POST/PUT/DELETE /api/rooms
```

**Meter Reading:**
```
User selects month → GET /api/meter-readings?month=2567-07 → Load previous readings
              User enters current readings
              Click save → POST /api/meter-readings (create) or PUT (update)
```

**Monthly Bills:**
```
User selects month → GET /api/bills?location=X&month=2567-07 → Render table
              Click room → Show calculated breakdown from bill record
              Toggle paid status → PATCH /api/bills/{id}
              Export PDF → GET /api/bills/{id}/export
```

### 3. Validation Rules

**Locations:**
- Name: Required, string
- Address: Optional string
- Phone: Optional string (phone format)

**Rooms:**
- Room number: Required, unique per location, alphanumeric
- Type: Required, from enum
- Base rent: Required, positive number
- Water/Electric rate: Required, positive number
- Options: Not required

**Meter Reading:**
- At least one reading required
- Values must be >= previous month's reading (non-negative delta)

**Bills:**
- Generated from meter readings (not manual entry)
- Sum of all components should equal total amount

### 4. Navigation Flow

```
Sidebar → Any page available
Home/Dashboard → (Optional, can go straight to Locations)
  ↓
Locations → Card view, manage locations
  ↓ (Click room button or nav)
Rooms → Table view per location
  ↓
Meter Reading → Enter monthly readings (all locations or single)
  ↓
Monthly Bills → View/export bills (all locations or single)
```

### 5. Error Handling

**Form Validation:**
- Show red border + error message below field
- Prevent submit if errors exist

**API Errors:**
- Show alert/toast with error message
- Log to console for debugging

**Empty States:**
- "No locations yet. Click 'Add' to create one."
- "No rooms in this location."

---

## 🚀 Quick Start Checklist

For developer:
- [ ] Create React/Vue project
- [ ] Copy shared.css and adapt to project
- [ ] Create Sidebar component
- [ ] Create Button, Card, Table, Modal, Form components
- [ ] Build Locations page
- [ ] Build Rooms page
- [ ] Build Meter Reading page
- [ ] Build Monthly Bills page
- [ ] Connect to backend API
- [ ] Test responsive design
- [ ] Test form validation
- [ ] Test modal interactions
- [ ] Deploy

---

## 📝 Notes

- All amounts in Thai Baht (บาท)
- All dates/months in Buddhist calendar (add 543 to CE year if displaying)
- Support Thai language Unicode characters (already in mockups)
- Consider dark mode toggle in future (prepared with CSS variables)
- Export functionality: Research pdf-lib or html2pdf libraries
- No authentication needed (spec: single user)

---

**Design Version**: 1.0  
**Framework Agnostic**: Yes (HTML/CSS can be adapted to any framework)  
**Accessibility**: WCAG AA compliant  
**Mobile Responsive**: Yes  
**Thai Language Ready**: Yes
