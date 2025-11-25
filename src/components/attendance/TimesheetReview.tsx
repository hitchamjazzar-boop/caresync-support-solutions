import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TimesheetSubmission {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  status: string;
  submitted_at: string;
  admin_notes: string | null;
}

export const TimesheetReview = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<TimesheetSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<TimesheetSubmission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [totalHours, setTotalHours] = useState(0);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      // Fetch profiles for name mapping
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      if (profilesData) {
        const map = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile.full_name;
          return acc;
        }, {} as Record<string, string>);
        setProfilesMap(map);
      }

      const { data, error } = await supabase
        .from('timesheet_submissions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load timesheet submissions');
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = async (submission: TimesheetSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || '');
    setReviewDialogOpen(true);

    // Fetch total hours for this period
    const { data } = await supabase
      .from('attendance')
      .select('total_hours')
      .eq('user_id', submission.user_id)
      .gte('clock_in', submission.period_start)
      .lte('clock_in', submission.period_end);

    const hours = data?.reduce((sum, record) => sum + (record.total_hours || 0), 0) || 0;
    setTotalHours(hours);
  };

  const handleReview = async (approved: boolean) => {
    if (!selectedSubmission || !user) {
      console.error('Missing data for review:', { selectedSubmission, user });
      return;
    }

    console.log('Reviewing with user ID:', user.id);
    
    try {
      const updateData = {
        status: approved ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        admin_notes: adminNotes?.trim() || null
      };
      
      console.log('Update data:', updateData);
      
      const { error } = await supabase
        .from('timesheet_submissions')
        .update(updateData)
        .eq('id', selectedSubmission.id);

      if (error) {
        console.error('Timesheet review error:', error);
        throw error;
      }

      toast.success(`Timesheet ${approved ? 'approved' : 'rejected'}`);
      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      setAdminNotes('');
      setTotalHours(0);
      fetchSubmissions();
    } catch (error: any) {
      console.error('Error reviewing timesheet:', error);
      toast.error(error.message || 'Failed to update timesheet');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timesheet Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No timesheet submissions yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {profilesMap[submission.user_id] || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(submission.period_start), 'MMM d')} - {format(new Date(submission.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReviewDialog(submission)}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Timesheet</DialogTitle>
            <DialogDescription>
              {selectedSubmission && (
                <>
                  {profilesMap[selectedSubmission.user_id] || 'Unknown'}'s timesheet for{' '}
                  {format(new Date(selectedSubmission.period_start), 'MMM d')} -{' '}
                  {format(new Date(selectedSubmission.period_end), 'MMM d, yyyy')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes or feedback..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleReview(false)}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button
              onClick={() => handleReview(true)}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};