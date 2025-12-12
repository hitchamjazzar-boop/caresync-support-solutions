import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, ClipboardList } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [myRequests, setMyRequests] = useState<FeedbackRequest[]>([]);
  const [allRequests, setAllRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);

    // Fetch requests assigned to current user (for answering)
    const { data: myRequestsData } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('recipient_id', user?.id)
      .order('created_at', { ascending: false });

    // Fetch all requests (for tracking)
    const { data: allRequestsData } = await supabase
      .from('feedback_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all unique user IDs
    const userIds = new Set<string>();
    myRequestsData?.forEach(r => {
      userIds.add(r.recipient_id);
      if (r.target_user_id) userIds.add(r.target_user_id);
    });
    allRequestsData?.forEach(r => {
      userIds.add(r.recipient_id);
      if (r.target_user_id) userIds.add(r.target_user_id);
    });

    if (userIds.size > 0) {
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setMyRequests(
        myRequestsData?.map(r => ({
          ...r,
          recipient_profile: profileMap.get(r.recipient_id),
          target_profile: r.target_user_id ? profileMap.get(r.target_user_id) : undefined,
        })) || []
      );

      setAllRequests(
        allRequestsData?.map(r => ({
          ...r,
          recipient_profile: profileMap.get(r.recipient_id),
          target_profile: r.target_user_id ? profileMap.get(r.target_user_id) : undefined,
        })) || []
      );
    } else {
      setMyRequests(myRequestsData || []);
      setAllRequests(allRequestsData || []);
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

  const pendingMyRequests = myRequests.filter(r => r.status === 'pending');

  return (
    <>
      <Tabs defaultValue="my-requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-requests" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            My Requests ({pendingMyRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all-requests" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            All Requests ({allRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests" className="space-y-4 mt-4">
          {pendingMyRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending requests for you to answer
              </CardContent>
            </Card>
          ) : (
            pendingMyRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg border"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">Feedback Request</p>
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
                  <Badge variant="secondary">{request.status}</Badge>
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
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="all-requests" className="space-y-4 mt-4">
          {allRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No feedback requests sent yet
              </CardContent>
            </Card>
          ) : (
            allRequests.map((request) => (
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
                <Badge variant={request.status === 'completed' ? 'default' : 'secondary'}>
                  {request.status}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

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
