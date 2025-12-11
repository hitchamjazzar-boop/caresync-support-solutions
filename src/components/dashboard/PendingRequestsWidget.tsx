import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Megaphone, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { playRequestNotificationSound } from '@/lib/sounds';
import { sendBrowserNotification } from '@/hooks/useBrowserNotifications';

export function PendingRequestsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shoutoutCount, setShoutoutCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const previousTotalRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCounts();

      // Set up real-time subscriptions
      const shoutoutChannel = supabase
        .channel('pending-shoutouts-count')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'shoutout_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            fetchCounts();
            // Play sound and show notification for new shoutout request
            playRequestNotificationSound();
            sendBrowserNotification(
              'New Shout Out Request',
              'You have a new shout out request to complete!',
              'shoutout-request'
            );
          }
        )
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
            event: 'INSERT',
            schema: 'public',
            table: 'feedback_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            fetchCounts();
            // Play sound and show notification for new feedback request
            playRequestNotificationSound();
            sendBrowserNotification(
              'New Feedback Request',
              'You have a new feedback request to complete!',
              'feedback-request'
            );
          }
        )
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
    <Card className="border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            Action Required
          </span>
          <Badge variant="destructive" className="text-sm animate-pulse">
            {totalCount} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">
          You have pending requests that need your attention!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {shoutoutCount > 0 && (
            <Button
              variant="outline"
              className="flex items-center justify-between gap-3 p-4 h-auto bg-background hover:bg-amber-100 dark:hover:bg-amber-900/30 border-amber-200 dark:border-amber-800"
              onClick={() => navigate('/shoutouts')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Shout Out Requests</p>
                  <p className="text-xs text-muted-foreground">Give recognition</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg font-bold">{shoutoutCount}</Badge>
            </Button>
          )}
          {feedbackCount > 0 && (
            <Button
              variant="outline"
              className="flex items-center justify-between gap-3 p-4 h-auto bg-background hover:bg-blue-100 dark:hover:bg-blue-900/30 border-blue-200 dark:border-blue-800"
              onClick={() => navigate('/feedback')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Feedback Requests</p>
                  <p className="text-xs text-muted-foreground">Share your thoughts</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg font-bold">{feedbackCount}</Badge>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}