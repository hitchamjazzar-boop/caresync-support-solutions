

## Opt-In Screen Monitoring on Clock-In

When an employee clocks in, they'll be prompted to share their screen. If they consent, the app will capture periodic screenshots and upload them to the backend. If they decline, they still clock in normally -- but admins can see who opted in and who didn't.

### How It Works

1. **After clock-in**, a dialog appears asking the employee to share their screen
2. If they click "Allow", the browser's native screen-sharing prompt appears (`getDisplayMedia`)
3. Once granted, a screenshot is captured every 5 minutes from the shared stream
4. Screenshots are uploaded to file storage and logged in a new database table
5. If they click "Skip", they clock in without monitoring (admins see this)
6. The screen share stops automatically on clock-out

### What the Admin Sees

- In the Attendance History, a small icon/badge shows whether an employee allowed screen monitoring
- A new "Screen Activity" section (or button) lets admins view the captured screenshots for any session, with timestamps

### Important Limitations

- The browser will show its own permission dialog -- this cannot be bypassed
- If the employee closes/refreshes the tab, the screen share stream ends and no more screenshots are captured until they re-enable it
- Screenshots only capture what the employee chose to share (a specific screen, window, or tab)

---

### Technical Details

**1. New Database Table: `screen_captures`**

| Column | Type | Description |
|---|---|---|
| id | uuid (PK) | Auto-generated |
| attendance_id | uuid (FK) | Links to the attendance session |
| user_id | uuid | The employee |
| image_url | text | Storage path of the screenshot |
| captured_at | timestamptz | When the screenshot was taken |

RLS: Admins can view all; employees cannot view their own captures (monitoring purpose).

**2. New Storage Bucket: `screen-captures`**

- Private bucket for storing screenshot images
- RLS: authenticated users can upload (insert); admins can read all

**3. Add `screen_monitoring_enabled` column to `attendance` table**

- Boolean, default `false`
- Set to `true` when the employee consents to screen sharing

**4. New Component: `ScreenMonitoringDialog.tsx`**

- Shown after successful clock-in
- Two buttons: "Allow Screen Monitoring" and "Skip"
- On allow: calls `navigator.mediaDevices.getDisplayMedia({ video: true })` to get a stream
- Stores the stream reference in a React ref

**5. New Hook: `useScreenCapture.ts`**

- Accepts the MediaStream and attendance_id
- Every 5 minutes, draws the video frame to an off-screen canvas, converts to a blob, uploads to storage, and inserts a record into `screen_captures`
- Cleans up on clock-out (stops the stream and clears the interval)
- Pauses capturing during breaks, resumes after

**6. Updates to `ClockInOut.tsx`**

- After successful clock-in, show the `ScreenMonitoringDialog`
- If user consents, start the capture hook
- On clock-out, stop the stream and interval
- Update the attendance record's `screen_monitoring_enabled` field

**7. New Component: `ScreenCaptureViewer.tsx` (Admin)**

- Accessible from AttendanceHistory for admin users
- Shows a grid/timeline of screenshots for a given attendance session
- Displays capture timestamps

**8. Updates to `AttendanceHistory.tsx`**

- Show a small monitor icon next to status badge when `screen_monitoring_enabled` is true
- Add a button for admins to open the `ScreenCaptureViewer` for that session

