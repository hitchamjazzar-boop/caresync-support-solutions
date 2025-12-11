import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoutoutsList } from '@/components/shoutouts/ShoutoutsList';
import { ShoutoutLeaderboard } from '@/components/shoutouts/ShoutoutLeaderboard';
import { ShoutoutRequestCard } from '@/components/shoutouts/ShoutoutRequestCard';
import { SendShoutoutRequestDialog } from '@/components/shoutouts/SendShoutoutRequestDialog';
import { GiveShoutoutDialog } from '@/components/shoutouts/GiveShoutoutDialog';
import { Heart, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PublishedShoutout {
  id: string;
  message: string;
  created_at: string;
  from_profile?: { full_name: string };
  to_profile?: { full_name: string };
}

export default function Shoutouts() {
  const { isAdmin } = useAdmin();
  const [publishedShoutouts, setPublishedShoutouts] = useState<PublishedShoutout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      fetchPublishedShoutouts();
    } else {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchPublishedShoutouts = async () => {
    const { data } = await supabase
      .from('shoutouts')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = new Set<string>();
      data.forEach(s => {
        userIds.add(s.from_user_id);
        userIds.add(s.to_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setPublishedShoutouts(
        data.map(s => ({
          ...s,
          from_profile: profileMap.get(s.from_user_id),
          to_profile: profileMap.get(s.to_user_id),
        }))
      );
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Shout Outs
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {isAdmin
              ? 'Manage shout out requests and employee recognitions'
              : 'Give recognition to your colleagues'}
          </p>
        </div>
        {isAdmin ? (
          <SendShoutoutRequestDialog />
        ) : (
          <GiveShoutoutDialog />
        )}
      </div>

      {isAdmin ? (
        <div className="space-y-6">
          <ShoutoutLeaderboard />
          <ShoutoutsList />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <ShoutoutRequestCard />
          <ShoutoutLeaderboard />
          {publishedShoutouts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium">No shout outs yet</p>
                <p className="text-sm mt-1">Be the first to recognize a colleague!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publishedShoutouts.map((shoutout) => (
                <Card key={shoutout.id} className="border-primary/20">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Heart className="h-4 w-4 text-primary fill-primary" />
                        {shoutout.to_profile?.full_name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">"{shoutout.message}"</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>From a colleague</span>
                      <Badge variant="secondary">
                        {format(new Date(shoutout.created_at), 'MMM dd')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
