import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { SubmitFeedbackDialog } from './SubmitFeedbackDialog';

interface FeedbackRequest {
  id: string;
  admin_id: string;
  message: string | null;
  status: string;
  created_at: string;
  target_user_id: string | null;
  admin_profile?: {
    full_name: string;
  };
  target_profile?: {
    full_name: string;
  };
}

export function FeedbackRequestCard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Set up real-time subscription for new requests
      const channel = supabase
        .channel('feedback-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback_requests',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback requests:', error);
    } else {
      // Fetch admin and target profiles separately
      const adminIds = [...new Set(data?.map(r => r.admin_id) || [])];
      const targetIds = [...new Set(data?.filter(r => r.target_user_id).map(r => r.target_user_id) || [])];
      const allIds = [...new Set([...adminIds, ...targetIds])];
      
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enrichedData = data?.map(r => ({
          ...r,
          admin_profile: profileMap.get(r.admin_id),
          target_profile: r.target_user_id ? profileMap.get(r.target_user_id) : undefined,
        })) || [];
        setRequests(enrichedData);
      } else {
        setRequests(data || []);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Feedback Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-background rounded-lg border"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {request.admin_profile?.full_name || 'Admin'} requested your feedback
                  {request.target_profile && (
                    <span className="text-primary"> about {request.target_profile.full_name}</span>
                  )}
                </p>
                {request.message && (
                  <p className="text-sm text-muted-foreground">{request.message}</p>
                )}
                <Badge variant="secondary" className="text-xs">
                  {format(new Date(request.created_at), 'MMM dd, yyyy')}
                </Badge>
              </div>
              <Button size="sm" onClick={() => setSelectedRequest(request)}>
                Submit Feedback
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <SubmitFeedbackDialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        requestId={selectedRequest?.id || ''}
        targetUserName={selectedRequest?.target_profile?.full_name}
        onSuccess={fetchRequests}
      />
    </>
  );
}
