# Apartment Management App - Mockup Files

## Quick Navigation

This folder contains HTML mockups for the main 4 screens of the apartment management web app. All mockups share a common CSS file for consistency.

### Mockup Files

1. **01-locations.html** — หอพัก (Locations Management)
   - View all locations/buildings
   - Add/Edit/Delete locations
   - Quick view of room count per location
   - Navigate to room management

2. **02-rooms.html** — ห้อง (Rooms Management)
   - View all rooms in a location
   - Detailed table with base rent, water/electric rates
   - Display active options (Parking, AC, Wi-Fi) as badges
   - Add/Edit/Delete rooms and their options

3. **03-meter-reading.html** — อ่านมิเตอร์ (Monthly Meter Reading)
   - Select location and month
   - Display previous month's readings (read-only)
   - Input current readings for water and electricity
   - Grid layout showing previous vs current side-by-side
   - Save button to record readings for the month

4. **04-monthly-bills.html** — บิลรายเดือน (Monthly Bill Summary)
   - Summary statistics (total rent, water, electric, grand total)
   - Detailed table with breakdown by room
   - Status badges (Paid/Unpaid)
   - Room details modal with full breakdown
   - Export PDF and Print functionality
   - Mark payment status

### Shared Assets

- **shared.css** — Design system CSS
  - Color palette and variables (CSS custom properties)
  - Typography scale
  - Spacing system (8px base unit)
  - Component styles (buttons, cards, tables, forms, modals)
  - Responsive breakpoints (mobile, tablet, desktop)
  - Utility classes and states

## How to Use

### For Designers
- All mockups are static HTML with inline CSS
- Colors, spacing, fonts are defined as CSS variables in `shared.css`
- To change theme/colors: update CSS variables in `:root`

### For Developers

1. **Integration Path**:
   - These mockups are presentation-only; data flows are indicated but not functional
   - Build React/Vue components based on the structure
   - Use the CSS as a foundation for component stylesheets
   - Implement the actual data binding and API calls

2. **File Organization Recommendation**:
   ```
   src/
   ├── components/
   │   ├── Sidebar.tsx
   │   ├── PageHeader.tsx
   │   ├── Cards/
   │   ├── Tables/
   │   ├── Buttons/
   │   ├── Forms/
   │   └── Modals/
   ├── styles/
   │   ├── design-system.css  (convert from shared.css)
   │   └── variables.css
   └── pages/
       ├── Locations.tsx
       ├── Rooms.tsx
       ├── MeterReading.tsx
       └── MonthlySummary.tsx
   ```

3. **CSS Integration**:
   - Option A: Use shared.css directly (quickest)
   - Option B: Convert to CSS-in-JS (emotion, styled-components)
   - Option C: Convert to Tailwind config with custom tokens
   - Keep CSS variables for dynamic theming capability

4. **Component Behavior Expected**:
   - **Sidebar**: Active state changes based on current route
   - **Modals**: Open/close triggered by buttons, close on Escape or overlay click
   - **Forms**: Validation on submit, error/success messages
   - **Tables**: Responsive stacking on mobile, sortable headers (optional)
   - **Month/Date pickers**: Use HTML5 `<input type="month">` or date library

5. **Key Interaction Flows**:

   **Locations → Rooms**:
   - Click "ดูห้อง →" button navigates to Rooms page for that location
   - Breadcrumb or back button to return to Locations

   **Rooms → Add/Edit**:
   - Click "เพิ่มห้อง" opens Add modal
   - Click "แก้ไข" on a room opens Edit modal with prefilled data
   - Room number becomes read-only in edit mode

   **Meter Reading Flow**:
   - User selects location and month
   - Form shows previous readings (disabled/read-only inputs)
   - User enters current readings
   - Save creates/updates MeterReading record

   **Monthly Bills Flow**:
   - Calculate bills after meter readings are saved
   - Display breakdown: baseRent + (waterDelta × waterRate) + (electricDelta × electricRate) + sum(options)
   - Show payment status (toggleable or tracked separately)

## Design Tokens Reference

### Colors
- Primary: `#2563EB` (Blue)
- Success: `#10B981` (Green)
- Error: `#EF4444` (Red)
- Warning: `#F59E0B` (Amber)
- Text Primary: `#1F2937` (Dark Gray)
- Text Secondary: `#6B7280` (Medium Gray)
- Background: `#F3F4F6` (Light Gray)
- White: `#FFFFFF`

### Typography
- Font Family: Inter, Segoe UI, Roboto, sans-serif
- Base Size: 16px
- Headings: H1 (2rem/700), H2 (1.5rem/700), H3 (1.25rem/600)
- Body: 1rem/400
- Small: 0.875rem/400
- Tiny: 0.75rem/400

### Spacing
- Base Unit: 8px
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

### Components
- Border Radius: 8px
- Button Min Height: 44px (touch-friendly)
- Sidebar Width: 256px (desktop), hidden/hamburger (mobile)
- Modal Max Width: 600px
- Card Padding: 16px
- Table Cell Padding: 12px

## Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Mobile Considerations
- Sidebar collapses to hamburger menu
- Tables convert to card stacks
- Full-width buttons and inputs
- Modal takes full width with padding
- Single column layout

## Accessibility Notes

- All buttons have 44px minimum height
- Color contrast ratios ≥ 4.5:1
- Semantic HTML (buttons, labels, fieldsets)
- Keyboard navigation supported (Tab, Enter, Escape)
- Form fields have associated labels
- Error messages clearly displayed

## Testing Checklist for Developers

- [ ] All buttons are clickable and 44px+ high
- [ ] Forms validate before submit
- [ ] Modals close on Escape key
- [ ] Modals close on overlay click
- [ ] Previous readings are read-only in meter reading form
- [ ] Month selector updates displayed data
- [ ] Bill breakdown sums correctly
- [ ] Responsive on mobile/tablet
- [ ] Color contrast meets WCAG AA standard
- [ ] Forms are keyboard navigable

## Notes for Implementation

1. **No Authentication**: App loads directly, no login screen needed
2. **Single User**: Simplified state management, no multi-user considerations
3. **Thai Language**: All UI text should support Thai characters (already included in mockups)
4. **Date Handling**: Consider using date library (date-fns, Day.js) for Thai year support (Buddhist calendar) if needed
5. **Number Formatting**: Display Thai-formatted numbers (3,000 with comma thousands separator)
6. **Currency**: All amounts in Thai Baht (บาท)
7. **Meter Reading Logic**: Show clear visual distinction between previous (disabled) and current (editable) fields
8. **Bill Export**: Consider using library like PDFKit or html2pdf for export functionality

---

**Design System Version**: 1.0  
**Last Updated**: July 2567  
**Status**: Ready for Development
