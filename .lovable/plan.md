

## Updated Break Time & Clock-Out Logic

### Current vs New Logic

**Current Logic:**
- Fixed 8-hour requirement
- Warning shows if worked < 8 hours
- Doesn't account for break overages in required time

**New Logic:**
- Base requirement: 8 hours
- Free lunch: 60 minutes (anything over must be made up)
- Free other breaks: 15 minutes (anything over must be made up)
- **Required time = 8 hours + excess lunch time + excess other breaks time**

### Example Scenarios

| Lunch Used | Other Breaks | Excess | Required Work Time |
|------------|--------------|--------|-------------------|
| 60m | 15m | 0m | 8h 0m |
| 60m | 25m | 10m | 8h 10m |
| 70m | 15m | 10m | 8h 10m |
| 70m | 25m | 20m | 8h 20m |
| 45m | 10m | 0m | 8h 0m |

### Implementation Changes

**File: `src/components/attendance/ClockInOut.tsx`**

Update `handleClockOut` to calculate dynamic required time:

```text
// Calculate excess break time
const lunchExcess = Math.max(0, lunchBreakMinutes - 60);
const otherExcess = Math.max(0, otherBreakMinutes - 15);
const totalExcessMinutes = lunchExcess + otherExcess;

// Required work time = 8 hours + excess breaks
const requiredMinutes = (8 * 60) + totalExcessMinutes;
const totalWorkedMinutes = (workedHours * 60) + workedMinutes;

if (totalWorkedMinutes < requiredMinutes) {
  // Show early clock-out dialog with dynamic required time
}
```

**File: `src/components/attendance/EarlyClockOutDialog.tsx`**

Update to accept dynamic required time and show breakdown:

- New props: `requiredHours`, `requiredMinutes`, `lunchExcess`, `otherExcess`
- Show why extra time is needed if breaks were exceeded
- Display: "You need to make up 10m due to exceeded breaks"

**Updated Warning Message:**

```text
┌────────────────────────────────────────┐
│  ⚠️ Clock out early?                   │
├────────────────────────────────────────┤
│  Time worked:      7h 45m              │
│  Base requirement: 8h 0m               │
│  + Lunch overtime: 10m (70m used)      │
│  + Break overtime: 5m (20m used)       │
│  ────────────────────────────          │
│  Total required:   8h 15m              │
│  Shortfall:        30m                 │
├────────────────────────────────────────┤
│  [Cancel]  [Continue Clock Out]        │
└────────────────────────────────────────┘
```

**Updated Break Warning (already visible while working):**

If they exceed limits, show message like:
> "You've exceeded your break limit! You need to work an extra 10m today to cover your breaks."

### Files to Modify

1. **`src/components/attendance/ClockInOut.tsx`**
   - Calculate excess break time
   - Pass dynamic required time to dialog
   - Update warning message to show time owed

2. **`src/components/attendance/EarlyClockOutDialog.tsx`**
   - Accept new props for dynamic requirements
   - Show breakdown of base time + excess breaks
   - Display specific overtime amounts

### Summary

- Employees get 60m lunch + 15m other breaks for free
- Any time over these limits adds to their 8-hour requirement
- The early clock-out dialog will show exactly why they need extra time
- The in-app warning will tell them how much extra time they owe

