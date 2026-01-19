import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, FileText, ListTodo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { format } from 'date-fns';

const eodSchema = z.object({
  tasks_completed: z.string().trim().min(1500, 'Please provide at least 1,500 characters').max(20000, 'Maximum 20,000 characters'),
  client_updates: z.string().trim().max(1000, 'Maximum 1000 characters').optional(),
  content_liked: z.string().trim().max(1000, 'Maximum 1000 characters').optional(),
  issues: z.string().trim().max(1000, 'Maximum 1000 characters').optional(),
  notes: z.string().trim().max(1000, 'Maximum 1000 characters').optional(),
});

export const EODReportForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    tasks_completed: '',
    client_updates: '',
    content_liked: '',
    issues: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's completed tasks
  const { data: completedTasks = [] } = useQuery({
    queryKey: ['completed-tasks-for-eod', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_daily_tasks')
        .select('title, notes, client_id')
        .eq('user_id', user?.id)
        .eq('task_date', today)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch clients for display
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    checkTodayAttendanceAndReport();
  }, [user]);

  const checkTodayAttendanceAndReport = async () => {
    if (!user) return;

    // Find the latest open attendance record for this user (currently clocked in)
    const { data: attendanceRecords, error } = await supabase
      .from('attendance')
      .select('id, clock_in, clock_out')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching attendance for EOD:', error);
      setAttendanceId(null);
      return;
    }

    const attendance = attendanceRecords?.[0] || null;


    if (attendance) {
      setAttendanceId(attendance.id);

      // Check if already submitted EOD report today
      const { data: report } = await supabase
        .from('eod_reports')
        .select('id')
        .eq('attendance_id', attendance.id)
        .maybeSingle();

      setHasSubmittedToday(!!report);
    } else {
      setAttendanceId(null);
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    return clients.find(c => c.id === clientId)?.name || null;
  };

  const handleLoadFromDiary = () => {
    if (completedTasks.length === 0) {
      toast({
        title: 'No Completed Tasks',
        description: 'You have no completed tasks in your diary for today.',
        variant: 'destructive',
      });
      return;
    }

    const tasksText = completedTasks
      .map((task) => {
        let line = `• ${task.title}`;
        const clientName = getClientName(task.client_id);
        if (clientName) {
          line += ` (${clientName})`;
        }
        if (task.notes) {
          line += ` - ${task.notes}`;
        }
        return line;
      })
      .join('\n');

    setFormData((prev) => ({
      ...prev,
      tasks_completed: tasksText,
    }));

    toast({
      title: 'Tasks Loaded',
      description: `Loaded ${completedTasks.length} completed task(s) from your diary.`,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxSize = 5 * 1024 * 1024; // 5MB per file
    const maxFiles = 5;

    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 5MB limit`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed`,
        variant: 'destructive',
      });
      return;
    }

    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    try {
      eodSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'destructive',
      });
      return;
    }

    if (!attendanceId) {
      toast({
        title: 'No Attendance Record',
        description: 'Please clock in before submitting an EOD report',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload files
      const uploadedFiles = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payslips')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('payslips')
          .getPublicUrl(fileName);

        uploadedFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });
      }

      // Submit EOD report
      const { error: reportError } = await supabase
        .from('eod_reports')
        .insert({
          user_id: user!.id,
          attendance_id: attendanceId,
          tasks_completed: formData.tasks_completed.trim(),
          client_updates: formData.client_updates.trim() || null,
          content_liked: formData.content_liked.trim() || null,
          issues: formData.issues.trim() || null,
          notes: formData.notes.trim() || null,
          attachments: uploadedFiles,
        });

      if (reportError) throw reportError;

      toast({
        title: 'EOD Report Submitted',
        description: 'Your end-of-day report has been submitted successfully',
      });

      setHasSubmittedToday(true);
      setFormData({
        tasks_completed: '',
        client_updates: '',
        content_liked: '',
        issues: '',
        notes: '',
      });
      setFiles([]);
    } catch (error: any) {
      console.error('Error submitting EOD report:', error);
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasSubmittedToday) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>EOD Report Submitted</CardTitle>
          <CardDescription>
            You've already submitted your end-of-day report for today. Thank you!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!attendanceId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clock In Required</CardTitle>
          <CardDescription>
            Please clock in for the day before submitting an EOD report.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>End of Day Report</CardTitle>
        <CardDescription>
          Submit your daily progress and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tasks_completed">Tasks Completed *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadFromDiary}
                disabled={completedTasks.length === 0}
              >
                <ListTodo className="h-4 w-4 mr-2" />
                Load from Diary ({completedTasks.length})
              </Button>
            </div>
            <Textarea
              id="tasks_completed"
              required
              placeholder="Describe what you accomplished today... (minimum 1,500 characters)"
              rows={8}
              value={formData.tasks_completed}
              onChange={(e) => setFormData({ ...formData, tasks_completed: e.target.value })}
              className={errors.tasks_completed ? 'border-destructive' : ''}
            />
            {errors.tasks_completed && (
              <p className="text-sm text-destructive">{errors.tasks_completed}</p>
            )}
            <p className={`text-xs ${formData.tasks_completed.length < 1500 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formData.tasks_completed.length.toLocaleString()}/20,000 characters (minimum 1,500)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_updates">Client Updates</Label>
            <Textarea
              id="client_updates"
              placeholder="Any client interactions or updates..."
              rows={3}
              value={formData.client_updates}
              onChange={(e) => setFormData({ ...formData, client_updates: e.target.value })}
              className={errors.client_updates ? 'border-destructive' : ''}
            />
            {errors.client_updates && (
              <p className="text-sm text-destructive">{errors.client_updates}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content_liked">Content/Posts Liked</Label>
            <Textarea
              id="content_liked"
              placeholder="Social media content you engaged with..."
              rows={3}
              value={formData.content_liked}
              onChange={(e) => setFormData({ ...formData, content_liked: e.target.value })}
              className={errors.content_liked ? 'border-destructive' : ''}
            />
            {errors.content_liked && (
              <p className="text-sm text-destructive">{errors.content_liked}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="issues">Issues/Blockers</Label>
            <Textarea
              id="issues"
              placeholder="Any challenges or blockers you faced..."
              rows={3}
              value={formData.issues}
              onChange={(e) => setFormData({ ...formData, issues: e.target.value })}
              className={errors.issues ? 'border-destructive' : ''}
            />
            {errors.issues && (
              <p className="text-sm text-destructive">{errors.issues}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any other notes or comments..."
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={errors.notes ? 'border-destructive' : ''}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <div className="space-y-3">
              <Input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maximum 5 files, 5MB each. Supported: Images, PDF, Word, Excel
              </p>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit EOD Report
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
