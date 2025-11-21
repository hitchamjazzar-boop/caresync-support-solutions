import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EODReportForm } from '@/components/eod/EODReportForm';
import { EODReportList } from '@/components/eod/EODReportList';
import { useAdmin } from '@/hooks/useAdmin';

export default function Reports() {
  const { isAdmin } = useAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">End-of-Day Reports</h1>
        <p className="text-muted-foreground">Submit and view daily work reports</p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="view" className="space-y-6">
          <TabsList>
            <TabsTrigger value="view">View Reports</TabsTrigger>
            <TabsTrigger value="submit">Submit Report</TabsTrigger>
          </TabsList>
          <TabsContent value="view" className="space-y-4">
            <EODReportList />
          </TabsContent>
          <TabsContent value="submit">
            <EODReportForm />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="submit">Submit Report</TabsTrigger>
            <TabsTrigger value="history">My Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="submit">
            <EODReportForm />
          </TabsContent>
          <TabsContent value="history">
            <EODReportList />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
