import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PendingRequestsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shoutoutCount, setShoutoutCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCounts();

      // Set up real-time subscriptions
      const shoutoutChannel = supabase
        .channel('pending-shoutouts-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'shoutout_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => fetchCounts()
        )
        .subscribe();

      const feedbackChannel = supabase
        .channel('pending-feedback-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => fetchCounts()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(shoutoutChannel);
        supabase.removeChannel(feedbackChannel);
      };
    }
  }, [user]);

  const fetchCounts = async () => {
    if (!user) return;

    const [shoutoutResult, feedbackResult] = await Promise.all([
      supabase
        .from('shoutout_requests')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending'),
      supabase
        .from('feedback_requests')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'pending'),
    ]);

    setShoutoutCount(shoutoutResult.count || 0);
    setFeedbackCount(feedbackResult.count || 0);
    setLoading(false);
  };

  const totalCount = shoutoutCount + feedbackCount;

  if (loading || totalCount === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>Pending Requests</span>
          <Badge variant="default" className="text-sm">
            {totalCount} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {shoutoutCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Shout Outs</p>
                <p className="text-2xl font-bold text-primary">{shoutoutCount}</p>
              </div>
            </div>
          )}
          {feedbackCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Feedback</p>
                <p className="text-2xl font-bold text-primary">{feedbackCount}</p>
              </div>
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          className="w-full mt-3"
          onClick={() => navigate('/shoutouts')}
        >
          View All Requests
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}