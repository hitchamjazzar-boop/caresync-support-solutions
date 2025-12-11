import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EODReportForm } from '@/components/eod/EODReportForm';
import { EODReportList } from '@/components/eod/EODReportList';
import { useAdmin } from '@/hooks/useAdmin';

export default function Reports() {
  const { isAdmin } = useAdmin();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">End-of-Day Reports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Submit and view daily work reports</p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="view" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="view" className="text-xs sm:text-sm">View Reports</TabsTrigger>
            <TabsTrigger value="submit" className="text-xs sm:text-sm">Submit Report</TabsTrigger>
          </TabsList>
          <TabsContent value="view" className="space-y-4">
            <EODReportList />
          </TabsContent>
          <TabsContent value="submit">
            <EODReportForm />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="submit" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="submit" className="text-xs sm:text-sm">Submit Report</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm">My Reports</TabsTrigger>
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
