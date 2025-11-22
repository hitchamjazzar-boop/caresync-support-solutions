import { Layout } from "@/components/Layout";
import { EmployeeColorSettings } from "@/components/calendar/EmployeeColorSettings";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function CalendarSettings() {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/calendar" replace />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-start sm:items-center gap-3">
          <Settings className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Calendar Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Manage calendar preferences and employee colors
            </p>
          </div>
        </div>

        <Separator />

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Employee Colors</CardTitle>
            <CardDescription className="text-sm">
              Customize calendar colors for each employee. Colors help distinguish
              schedules at a glance and remain consistent across all views.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <EmployeeColorSettings />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
