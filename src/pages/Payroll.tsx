import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InfoIcon, BarChart3 } from 'lucide-react';
import { PayrollGenerator } from '@/components/payroll/PayrollGenerator';
import { PayrollList } from '@/components/payroll/PayrollList';

export default function Payroll() {
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePayrollGenerated = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payroll Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isAdmin ? 'Generate and manage employee payroll' : 'View your payroll history'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/payroll/analytics')} variant="outline" className="w-full sm:w-auto">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Analytics
          </Button>
        )}
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle className="text-sm sm:text-base">Payment Schedule</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm">
          We process payroll on the <strong>1st</strong> and <strong>16th</strong> of each month.
          If the payment date falls on a weekend, payment will be processed on the following Monday.
        </AlertDescription>
      </Alert>

      {isAdmin ? (
        <Tabs defaultValue="generate" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="generate" className="text-xs sm:text-sm">Generate Payroll</TabsTrigger>
            <TabsTrigger value="records" className="text-xs sm:text-sm">Payroll Records</TabsTrigger>
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
