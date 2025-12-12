import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { SubmitFeedbackDialog } from './SubmitFeedbackDialog';

interface FeedbackRequest {
  id: string;
  admin_id: string;
  recipient_id: string;
  target_user_id: string | null;
  message: string | null;
  status: string;
  created_at: string;
  recipient_profile?: { full_name: string };
  target_profile?: { full_name: string };
}

export function FeedbackRequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);

    // Fetch requests assigned to current user only
    const { data: requestsData } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('recipient_id', user?.id)
      .order('created_at', { ascending: false });

    if (requestsData && requestsData.length > 0) {
      // Get all unique user IDs
      const userIds = new Set<string>();
      requestsData.forEach(r => {
        userIds.add(r.recipient_id);
        if (r.target_user_id) userIds.add(r.target_user_id);
      });

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setRequests(
        requestsData.map(r => ({
          ...r,
          recipient_profile: profileMap.get(r.recipient_id),
          target_profile: r.target_user_id ? profileMap.get(r.target_user_id) : undefined,
        }))
      );
    } else {
      setRequests(requestsData || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback Requests ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No feedback requests sent yet</p>
          ) : (
            requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Request to {request.recipient_profile?.full_name || 'Unknown'}
                  </p>
                  {request.target_profile && (
                    <p className="text-xs text-muted-foreground">
                      For: {request.target_profile.full_name}
                    </p>
                  )}
                  {request.message && (
                    <p className="text-sm text-muted-foreground">"{request.message}"</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), 'MMM dd, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                    {request.status}
                  </Badge>
                  {request.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setAnswerDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Answer
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {selectedRequest && (
        <SubmitFeedbackDialog
          open={answerDialogOpen}
          onOpenChange={setAnswerDialogOpen}
          requestId={selectedRequest.id}
          targetUserName={selectedRequest.target_profile?.full_name}
          onSuccess={() => {
            fetchRequests();
            setSelectedRequest(null);
          }}
        />
      )}
    </>
  );
}
