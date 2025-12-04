import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateInvoiceForm } from '@/components/invoices/CreateInvoiceForm';
import { InvoiceList } from '@/components/invoices/InvoiceList';
import { FileText } from 'lucide-react';

const EmployeeInvoices = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInvoiceCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Employee Invoices</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Create and manage employee invoices' : 'View your invoices'}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="create" className="space-y-4">
          <TabsList>
            <TabsTrigger value="create">Create Invoice</TabsTrigger>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <CreateInvoiceForm onInvoiceCreated={handleInvoiceCreated} />
          </TabsContent>

          <TabsContent value="all">
            <InvoiceList key={refreshKey} showAllEmployees />
          </TabsContent>
        </Tabs>
      ) : (
        <InvoiceList key={refreshKey} userId={user?.id} />
      )}
    </div>
  );
};

export default EmployeeInvoices;
