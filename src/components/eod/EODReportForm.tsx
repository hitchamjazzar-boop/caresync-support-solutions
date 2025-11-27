import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, X, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const eodSchema = z.object({
  tasks_completed: z.string().trim().min(10, 'Please provide at least 10 characters').max(2000, 'Maximum 2000 characters'),
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

  useEffect(() => {
    checkTodayAttendanceAndReport();
  }, [user]);

  const checkTodayAttendanceAndReport = async () => {
    if (!user) return;

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    // Check for today's attendance (clocked in today)
    // Using date comparison to avoid timezone issues
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('id, clock_in')
      .eq('user_id', user.id)
      .gte('clock_in', `${todayDate}T00:00:00`)
      .lt('clock_in', `${year}-${month}-${String(today.getDate() + 1).padStart(2, '0')}T00:00:00`)
      .order('clock_in', { ascending: false })
      .limit(1);

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
            <Label htmlFor="tasks_completed">Tasks Completed *</Label>
            <Textarea
              id="tasks_completed"
              required
              placeholder="Describe what you accomplished today..."
              rows={4}
              value={formData.tasks_completed}
              onChange={(e) => setFormData({ ...formData, tasks_completed: e.target.value })}
              className={errors.tasks_completed ? 'border-destructive' : ''}
            />
            {errors.tasks_completed && (
              <p className="text-sm text-destructive">{errors.tasks_completed}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.tasks_completed.length}/2000 characters
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
