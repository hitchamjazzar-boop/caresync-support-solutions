import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { PayrollGenerator } from '@/components/payroll/PayrollGenerator';
import { PayrollList } from '@/components/payroll/PayrollList';

export default function Payroll() {
  const { isAdmin } = useAdmin();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePayrollGenerated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Generate and manage employee payroll' : 'View your payroll history'}
        </p>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Payment Schedule</AlertTitle>
        <AlertDescription>
          We process payroll on the <strong>1st</strong> and <strong>16th</strong> of each month.
          If the payment date falls on a weekend, payment will be processed on the following Monday.
          Please note that we do not process payroll payments on weekends.
        </AlertDescription>
      </Alert>

      {isAdmin ? (
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate Payroll</TabsTrigger>
            <TabsTrigger value="records">Payroll Records</TabsTrigger>
          </TabsList>
          <TabsContent value="generate">
            <PayrollGenerator onSuccess={handlePayrollGenerated} />
          </TabsContent>
          <TabsContent value="records">
            <PayrollList refresh={refreshKey} />
          </TabsContent>
        </Tabs>
      ) : (
        <PayrollList refresh={refreshKey} />
      )}
    </div>
  );
}
