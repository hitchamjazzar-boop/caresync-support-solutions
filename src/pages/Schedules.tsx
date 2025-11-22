import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Schedules() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Schedules</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">View and manage shift schedules</p>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Schedule management coming soon</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <p className="text-sm sm:text-base text-muted-foreground">
            This section will include roster management, shift scheduling, and calendar views.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
