import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Loader2, Eye, Megaphone, Check } from 'lucide-react';
import { format } from 'date-fns';

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
  message: string | null;
  status: string;
  created_at: string;
  recipient_profile?: { full_name: string };
}

export function ShoutoutsList() {
  const { toast } = useToast();
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [requests, setRequests] = useState<ShoutoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);

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

    // Fetch requests
    const { data: requestsData } = await supabase
      .from('shoutout_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // Get all unique user IDs
    const userIds = new Set<string>();
    shoutoutsData?.forEach(s => {
      userIds.add(s.from_user_id);
      userIds.add(s.to_user_id);
    });
    requestsData?.forEach(r => {
      userIds.add(r.recipient_id);
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

      setRequests(
        requestsData?.map(r => ({
          ...r,
          recipient_profile: profileMap.get(r.recipient_id),
        })) || []
      );
    } else {
      setShoutouts(shoutoutsData || []);
      setRequests(requestsData || []);
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
          content: `${shoutout.from_profile?.full_name} says: "${shoutout.message}"`,
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

  return (
    <Tabs defaultValue="shoutouts" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="shoutouts" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Shout Outs ({shoutouts.length})
        </TabsTrigger>
        <TabsTrigger value="requests" className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Requests ({requests.length})
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

      <TabsContent value="requests" className="space-y-4 mt-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No requests sent yet
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    Request to {request.recipient_profile?.full_name}
                  </CardTitle>
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
  );
}
