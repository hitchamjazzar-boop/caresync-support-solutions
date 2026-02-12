

## Enforce Mandatory Screen Sharing for All Employees

### Problem
Currently, the clock-in flow has a fallback that silently allows employees to clock in **without** screen sharing when `getDisplayMedia` is blocked (e.g., in restricted browser environments). This means employees could potentially bypass the screen monitoring requirement.

### Solution
Remove the permissive fallback. If screen sharing is required for an employee and it fails for **any** reason, the clock-in will be cancelled. Employees must use the published app URL where screen sharing works in all modern browsers.

### Changes

**File: `src/components/attendance/ClockInOut.tsx`**

1. **Remove the environment fallback** (lines 282-288) that currently allows clock-in without screen sharing when `getDisplayMedia` is blocked.
2. **Treat all failures the same**: whether the user cancels, the browser blocks it, or the API is unavailable -- if screen monitoring is required, clock-in gets reverted with a clear error message telling the employee to use a supported browser.
3. **Add a more helpful error message** that guides the employee: "Screen sharing is required. Please use a supported browser (Chrome, Edge, or Firefox) and access the app directly (not in an embedded frame)."

### Technical Details

The catch block in `handleAllowScreenMonitoring` currently has two paths:
- **Environment restriction** (iframe/unsupported): silently allows clock-in -- this will be removed
- **User cancellation**: reverts clock-in -- this stays

After the change, there will be one unified path: any failure reverts the clock-in with a helpful error message.

### What This Means for Testing
- The Lovable preview (iframe) will **not** support screen sharing -- this is expected and cannot be changed
- Employees must use the **published app URL** where screen sharing works perfectly in Chrome, Edge, and Firefox
- Admins can still toggle screen monitoring on/off per employee from the Employees page

