# QuotaWarning Component - Claymorphism Design

## Components

### 1. QuotaWarning (Banner)
Shows warning banner when room usage ≥ 90% of limit.

**Props:**
- `currentRooms: number` - Current room count
- `maxRooms: number` - Maximum allowed rooms
- `planCode: string` - Plan identifier

**Usage:**
```tsx
import { QuotaWarning } from '@/components/QuotaWarning';

<QuotaWarning 
  currentRooms={9} 
  maxRooms={10} 
  planCode="STARTER" 
/>
```

**Features:**
- Yellow-orange gradient background
- Thick 4px black border
- 6px shadow for claymorphism effect
- Warning icon ⚠️
- "ดูแผนอื่น" CTA button → /app/subscription/plans
- Dismissible with X button
- Auto-hides when dismissed or < 90% usage

---

### 2. QuotaExceededModal
Shows modal when API returns 403 room_quota_exceeded error.

**Props:**
- `isOpen: boolean` - Modal visibility
- `onClose: () => void` - Close handler
- `error: { error: 'room_quota_exceeded', current: number, limit: number, planCode: string }`

**Usage:**
```tsx
import { QuotaExceededModal } from '@/components/QuotaWarning';

const [quotaError, setQuotaError] = useState(null);

// In your API error handler:
if (res.status === 403) {
  const data = await res.json();
  if (data.error === 'room_quota_exceeded') {
    setQuotaError(data);
  }
}

// Render modal:
<QuotaExceededModal
  isOpen={!!quotaError}
  onClose={() => setQuotaError(null)}
  error={quotaError}
/>
```

**Features:**
- Red-orange gradient background
- Thick 4px black border
- 8px shadow for claymorphism effect  
- Error icon 🚫 with shake animation
- Centered modal with bounce-in animation
- Two buttons: "ปิด" (secondary) and "ดูแผนอื่น" (primary)
- Locks body scroll when open
- Responsive mobile design

---

## Styling

All styles defined in `app/globals.css`:
- `.quota-warning-clay` - Banner container
- `.quota-modal-clay` - Modal container
- Thick borders (3-4px solid black)
- Vibrant gradients (yellow/orange for warning, red/orange for error)
- Hard shadows for claymorphism effect
- Playful hover animations

## Backward Compatibility

Legacy exports for existing code:
- `QuotaBanner` → maps to `QuotaWarning`
- `QuotaModal` → maps to `QuotaExceededModal`
- `FeatureUpgradeCTA` - unchanged
