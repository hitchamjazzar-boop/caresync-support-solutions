import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Schedules() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
        <p className="text-muted-foreground">View and manage shift schedules</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule management coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will include roster management, shift scheduling, and calendar views.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
