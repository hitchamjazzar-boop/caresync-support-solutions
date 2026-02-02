

## Break Time Report & Early Clock-Out Warning

### Overview
This plan implements two key features:
1. **Attendance Analytics Report** - A new admin-only page showing break time analysis with alerts for employees exceeding the 15-minute daily break limit
2. **Early Clock-Out Confirmation** - A warning dialog when employees try to clock out before completing 8 hours of work

---

### Feature 1: Attendance Analytics Report (Admin Only)

**New Page: `src/pages/AttendanceAnalytics.tsx`**

This will include:

**Summary Cards:**
- Total employees tracked today
- Employees currently working
- Employees on break
- Employees exceeding break limit (flagged in red)

**Main Report Table:**
| Employee | Date | Total Work Hours | Total Break Time | Break Count | Status |
|----------|------|------------------|------------------|-------------|--------|
| John Doe | Feb 2 | 7.5h | 22m | 3 | Over Limit |
| Jane Smith | Feb 2 | 8.2h | 12m | 2 | OK |

**Break Breakdown (expandable per employee):**
- Lunch: 10m (10:30 - 10:40)
- Coffee: 5m (14:00 - 14:05)
- Bathroom: 7m (16:00 - 16:07)

**Visual Indicators:**
- Green badge: Under 15 minutes total breaks
- Yellow badge: 15-20 minutes (warning)
- Red badge: Over 20 minutes (exceeded)

**Filters:**
- Date range picker (Today, This Week, This Month, Custom)
- Employee dropdown
- "Show only exceeded" toggle

---

### Feature 2: Early Clock-Out Confirmation

**Modified: `src/components/attendance/ClockInOut.tsx`**

When an employee clicks "Clock Out":

1. **Calculate worked hours** (excluding breaks)
2. **If under 8 hours**, show an AlertDialog:

```
Are you sure you want to clock out early?

You've only worked 6h 45m today.
Required: 8 hours
Shortfall: 1h 15m

This will be recorded in your attendance history.

[Continue Clock Out] [Cancel]
```

3. **If at or over 8 hours**, proceed normally with success toast

---

### Technical Implementation

**Files to Create:**
1. `src/pages/AttendanceAnalytics.tsx` - Main analytics page
2. `src/components/attendance/BreakTimeReport.tsx` - Report table component
3. `src/components/attendance/EarlyClockOutDialog.tsx` - Confirmation dialog

**Files to Modify:**
1. `src/App.tsx` - Add route `/attendance/analytics`
2. `src/components/attendance/ClockInOut.tsx` - Add early clock-out check
3. `src/components/Layout.tsx` - Add navigation link (admin only)

**Data Flow:**
- Query `attendance` table for date range
- Join with `attendance_breaks` for break details
- Join with `profiles` for employee names
- Calculate totals and flag violations

---

### Database
No database changes required - all data already exists in `attendance` and `attendance_breaks` tables.

---

### Summary
- New analytics page at `/attendance/analytics` (admin only)
- Shows which employees exceed 15-minute daily break limit
- Detailed breakdown of each break type and duration
- Confirmation dialog warns employees clocking out before 8 hours
- Uses existing UI patterns (recharts, tables, badges) from PayrollAnalytics

