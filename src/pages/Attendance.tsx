import { ClockInOut } from '@/components/attendance/ClockInOut';
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';

export default function Attendance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
        <p className="text-muted-foreground">
          Clock in, clock out, and manage your work hours
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ClockInOut />
        </div>
        <div className="lg:col-span-2">
          <AttendanceHistory />
        </div>
      </div>
    </div>
  );
}
