import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Attendance() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
        <p className="text-muted-foreground">
          Clock in, clock out, and manage your work hours
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance features coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will include clock in/out functionality, break tracking, and attendance
            history.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
