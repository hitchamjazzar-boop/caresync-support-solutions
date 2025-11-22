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
      <div className="container max-w-4xl py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Calendar Settings</h1>
              <p className="text-muted-foreground">
                Manage calendar preferences and employee colors
              </p>
            </div>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Employee Colors</CardTitle>
              <CardDescription>
                Customize calendar colors for each employee. Colors help distinguish
                schedules at a glance and remain consistent across all views.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeColorSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
