import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { formatDistanceToNow } from 'date-fns';

interface Feedback {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export default function Feedback() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchFeedback();

    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_feedback',
        },
        () => {
          fetchFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const fetchFeedback = async () => {
    try {
      let query = supabase
        .from('employee_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(f => f.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));

        const feedbackWithProfiles = data.map(fb => ({
          ...fb,
          profiles: profilesMap.get(fb.user_id) || { full_name: 'Unknown User' },
        }));

        setFeedback(feedbackWithProfiles as Feedback[]);
      } else {
        setFeedback([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (feedbackId: string) => {
    if (!responseText.trim()) return;

    try {
      const { error } = await supabase
        .from('employee_feedback')
        .update({
          admin_response: responseText.trim(),
          status: 'reviewed',
        })
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Response sent successfully',
      });

      setResponding(null);
      setResponseText('');
      fetchFeedback();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleResolve = async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('employee_feedback')
        .update({
          status: 'resolved',
        })
        .eq('id', feedbackId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Feedback marked as resolved',
      });

      fetchFeedback();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      pending: 'default',
      reviewed: 'secondary',
      resolved: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
        {status === 'reviewed' && <CheckCircle2 className="mr-1 h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage employee feedback' : 'Submit and track your feedback'}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setFeedbackDialogOpen(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Send Feedback
          </Button>
        )}
      </div>

      {feedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No feedback yet</p>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? 'Employee feedback will appear here' : 'Start by sending your first feedback'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{item.subject}</CardTitle>
                    {isAdmin && (
                      <CardDescription>
                        From: {item.profiles.full_name}
                      </CardDescription>
                    )}
                    <CardDescription>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Message:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
                </div>

                {item.admin_response && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-1">Admin Response:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.admin_response}</p>
                    {isAdmin && item.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(item.id)}
                        className="mt-2"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                )}

                {isAdmin && !item.admin_response && (
                  <div className="border-t pt-4 space-y-2">
                    {responding === item.id ? (
                      <>
                        <Textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Write your response..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRespond(item.id)}
                            disabled={!responseText.trim()}
                          >
                            Send Response
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResponding(null);
                              setResponseText('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResponding(item.id)}
                      >
                        Respond
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        onSuccess={fetchFeedback}
      />
    </div>
  );
}
