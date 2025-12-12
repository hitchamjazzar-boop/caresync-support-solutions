import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Loader2, Eye, Megaphone, Check, MessageSquare, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { SubmitShoutoutDialog } from './SubmitShoutoutDialog';

interface Shoutout {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  is_published: boolean;
  created_at: string;
  from_profile?: { full_name: string };
  to_profile?: { full_name: string };
}

interface ShoutoutRequest {
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

export function ShoutoutsList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [myRequests, setMyRequests] = useState<ShoutoutRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ShoutoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShoutoutRequest | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch shoutouts
    const { data: shoutoutsData } = await supabase
      .from('shoutouts')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch requests assigned to current user (for answering)
    const { data: myRequestsData } = await supabase
      .from('shoutout_requests')
      .select('*')
      .eq('recipient_id', user?.id)
      .order('created_at', { ascending: false });

    // Fetch all requests (for tracking)
    const { data: allRequestsData } = await supabase
      .from('shoutout_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all unique user IDs
    const userIds = new Set<string>();
    shoutoutsData?.forEach(s => {
      userIds.add(s.from_user_id);
      userIds.add(s.to_user_id);
    });
    myRequestsData?.forEach(r => {
      userIds.add(r.recipient_id);
      if (r.target_user_id) userIds.add(r.target_user_id);
    });
    allRequestsData?.forEach(r => {
      userIds.add(r.recipient_id);
      if (r.target_user_id) userIds.add(r.target_user_id);
    });

    // Fetch profiles
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setShoutouts(
        shoutoutsData?.map(s => ({
          ...s,
          from_profile: profileMap.get(s.from_user_id),
          to_profile: profileMap.get(s.to_user_id),
        })) || []
      );

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
      setShoutouts(shoutoutsData || []);
      setMyRequests(myRequestsData || []);
      setAllRequests(allRequestsData || []);
    }

    setLoading(false);
  };

  const handlePublish = async (shoutout: Shoutout) => {
    setPublishingId(shoutout.id);
    try {
      // Create announcement
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: announcementError } = await supabase
        .from('announcements')
        .insert({
          title: `🎉 Shout Out to ${shoutout.to_profile?.full_name}!`,
          content: `A colleague says: "${shoutout.message}"`,
          created_by: user.id,
          is_active: true,
          is_pinned: true,
          target_type: 'all',
          featured_user_id: shoutout.to_user_id,
        });

      if (announcementError) throw announcementError;

      // Update shoutout as published
      const { error: updateError } = await supabase
        .from('shoutouts')
        .update({ is_published: true })
        .eq('id', shoutout.id);

      if (updateError) throw updateError;

      toast({
        title: 'Published!',
        description: 'The shout out has been published as an announcement.',
      });
      fetchData();
    } catch (error) {
      console.error('Error publishing shoutout:', error);
      toast({
        title: 'Error',
        description: 'Failed to publish shout out.',
        variant: 'destructive',
      });
    } finally {
      setPublishingId(null);
    }
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
    <Tabs defaultValue="shoutouts" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="shoutouts" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">Shout Outs</span> ({shoutouts.length})
        </TabsTrigger>
        <TabsTrigger value="my-requests" className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          <span className="hidden sm:inline">My Requests</span> ({pendingMyRequests.length})
        </TabsTrigger>
        <TabsTrigger value="all-requests" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">All Requests</span> ({allRequests.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shoutouts" className="space-y-4 mt-4">
        {shoutouts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No shout outs yet
            </CardContent>
          </Card>
        ) : (
          shoutouts.map((shoutout) => (
            <Card key={shoutout.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {shoutout.from_profile?.full_name} → {shoutout.to_profile?.full_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {shoutout.is_published ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(shoutout)}
                        disabled={publishingId === shoutout.id}
                      >
                        {publishingId === shoutout.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Eye className="h-4 w-4 mr-1" />
                        )}
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">"{shoutout.message}"</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(shoutout.created_at), 'MMM dd, yyyy h:mm a')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="my-requests" className="space-y-4 mt-4">
        {pendingMyRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No pending requests for you to answer
            </CardContent>
          </Card>
        ) : (
          pendingMyRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Shoutout Request
                    </CardTitle>
                    {request.target_profile && (
                      <p className="text-xs text-muted-foreground">
                        For: {request.target_profile.full_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {request.status}
                    </Badge>
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
              </CardHeader>
              <CardContent>
                {request.message && (
                  <p className="text-sm mb-2 text-muted-foreground">
                    "{request.message}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(request.created_at), 'MMM dd, yyyy h:mm a')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="all-requests" className="space-y-4 mt-4">
        {allRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No requests sent yet
            </CardContent>
          </Card>
        ) : (
          allRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      Request to {request.recipient_profile?.full_name}
                    </CardTitle>
                    {request.target_profile && (
                      <p className="text-xs text-muted-foreground">
                        For: {request.target_profile.full_name}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={request.status === 'completed' ? 'default' : 'secondary'}
                  >
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {request.message && (
                  <p className="text-sm mb-2 text-muted-foreground">
                    "{request.message}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(request.created_at), 'MMM dd, yyyy h:mm a')}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>

    {selectedRequest && (
      <SubmitShoutoutDialog
        open={answerDialogOpen}
        onOpenChange={setAnswerDialogOpen}
        requestId={selectedRequest.id}
        targetUserId={selectedRequest.target_user_id}
        onSuccess={() => {
          fetchData();
          setSelectedRequest(null);
        }}
      />
    )}
  </>
  );
}
