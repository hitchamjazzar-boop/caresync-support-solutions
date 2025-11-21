import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Calendar, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { format } from 'date-fns';

interface EODReport {
  id: string;
  user_id: string;
  attendance_id: string;
  tasks_completed: string;
  client_updates: string | null;
  content_liked: string | null;
  issues: string | null;
  notes: string | null;
  attachments: any;
  submitted_at: string;
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  } | null;
}

export const EODReportList = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [reports, setReports] = useState<EODReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    fetchReports();
  }, [user, isAdmin, filter]);

  const fetchReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('eod_reports')
        .select('*')
        .order('submitted_at', { ascending: false });

      // Apply date filter
      const now = new Date();
      if (filter === 'today') {
        const today = now.toISOString().split('T')[0];
        query = query.gte('submitted_at', `${today}T00:00:00`).lte('submitted_at', `${today}T23:59:59`);
      } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('submitted_at', weekAgo.toISOString());
      }

      // Non-admins can only see their own reports
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Fetch profiles for all unique user IDs
      const userIds = [...new Set(reportsData.map(r => r.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge profiles with reports
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedReports = reportsData.map(report => ({
        ...report,
        profiles: profilesMap.get(report.user_id) || null,
      }));

      setReports(mergedReports as EODReport[]);
    } catch (error) {
      console.error('Error fetching EOD reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const ReportCard = ({ report }: { report: EODReport }) => {
    const attachments = Array.isArray(report.attachments) ? report.attachments : [];
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {report.profiles?.photo_url ? (
                <img
                  src={report.profiles.photo_url}
                  alt={report.profiles.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-base">{report.profiles?.full_name || 'Unknown'}</CardTitle>
                <p className="text-sm text-muted-foreground">{report.profiles?.position || 'N/A'}</p>
              </div>
            </div>
          <div className="text-right">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(report.submitted_at), 'MMM dd, yyyy')}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(report.submitted_at), 'hh:mm a')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Tasks Completed</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {report.tasks_completed}
          </p>
        </div>

        {report.client_updates && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Client Updates</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.client_updates}
            </p>
          </div>
        )}

        {report.content_liked && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Content Liked</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.content_liked}
            </p>
          </div>
        )}

        {report.issues && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Issues/Blockers</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.issues}
            </p>
          </div>
        )}

        {report.notes && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Additional Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.notes}
            </p>
          </div>
        )}

        {attachments.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Attachments</h4>
            <div className="space-y-2">
              {attachments.map((file: any, index: number) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">EOD Reports</h2>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No EOD reports found for the selected period.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
};
