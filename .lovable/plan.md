

## Fix Screen Sharing Flow for Zayrene's Account

### Problem Identified
The core issue is a **browser security restriction**: `getDisplayMedia()` must be called as a direct result of a user gesture (click). In the current code, the dialog is dismissed first (`setShowScreenMonitoringDialog(false)`) which triggers a React re-render, and THEN `getDisplayMedia` is called. By that point, the browser no longer considers it a valid user gesture and blocks the request, throwing an error that triggers the catch block -- which cancels the clock-in with "Screen sharing is required. Clock-in has been cancelled."

### Root Cause
In `handleAllowScreenMonitoring` (line 240-284 of ClockInOut.tsx):
```
setShowScreenMonitoringDialog(false);  // <-- closes dialog, triggers re-render
const stream = await navigator.mediaDevices.getDisplayMedia(...)  // <-- too late, gesture lost
```

### Fix Plan

**File: `src/components/attendance/ClockInOut.tsx`**

1. **Reorder the getDisplayMedia call** -- Call `getDisplayMedia()` FIRST (while still in the direct click handler chain), and only close the dialog AFTER the stream is obtained successfully. This preserves the user gesture context.

2. **Improve the `ended` event handler** -- Use a dedicated ref-based callback pattern (as recommended) so the handler always has access to the latest attendance state, preventing stale closure bugs.

3. **Ensure break flow works correctly** -- Currently `stopCapture()` calls `stream.getTracks().forEach(track => track.stop())` which permanently kills the stream. During breaks, we should only pause the capture interval without stopping the stream tracks. This way, when the break ends, the existing stream can resume capturing without needing a new `getDisplayMedia` prompt.

**File: `src/hooks/useScreenCapture.ts`**

4. **Split stop logic** -- Create a `pauseCapture()` method that only clears the interval (for breaks) vs `stopCapture()` that fully stops tracks (for clock-out/cancel). The current `stopCapture` kills the stream tracks which means after a break, we'd need to re-prompt -- but browsers require a fresh user gesture for `getDisplayMedia`, making seamless resumption impossible with the current approach.

5. **Alternative break approach** -- Since `getDisplayMedia` always requires user interaction, the break flow will keep the stream alive but pause screenshots. The `isOnBreak` flag already stops the capture interval (line 129). The fix is to NOT call `stopCapture()` during breaks -- just let the `isOnBreak` prop handle pausing screenshots naturally.

### Summary of Changes

| Change | File | What |
|--------|------|------|
| Fix gesture timing | ClockInOut.tsx | Call `getDisplayMedia` before closing dialog |
| Fix break flow | ClockInOut.tsx | Remove `stopCapture()` call during breaks; keep stream alive, just pause captures via `isOnBreak` |
| Add `pauseCapture` | useScreenCapture.ts | New method that only clears interval without stopping tracks |
| Fix clock-out flow | ClockInOut.tsx | Keep using `stopCapture` (with track.stop()) only for actual clock-out |
| Fix stop-sharing handler | ClockInOut.tsx | Ensure the `ended` listener reliably cancels attendance using refs |

### Expected Behavior After Fix
- Clock in with screen sharing: works because `getDisplayMedia` runs in direct click context
- Screenshots every 5 minutes: already works (confirmed 1 capture in storage), will continue working
- Clock out: automatically stops screen sharing (stream tracks stopped)
- Break: pauses screenshots but keeps stream alive (no re-prompt needed)
- Back from break: screenshots resume automatically (stream still active)
- Manual "Stop sharing": cancels attendance and stops work timer

