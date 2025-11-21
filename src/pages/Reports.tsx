import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">End-of-Day Reports</h1>
        <p className="text-muted-foreground">Submit and view daily work reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>EOD reporting coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will include daily report submission forms, report history, and admin
            review capabilities.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
