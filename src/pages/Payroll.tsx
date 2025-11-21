import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Payroll() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">View payslips and payment history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll features coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section will include payslip downloads, payment history, and admin payroll
            management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
