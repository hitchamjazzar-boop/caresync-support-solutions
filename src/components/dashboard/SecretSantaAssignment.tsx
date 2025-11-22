import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function SecretSantaAssignment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<any>(null);
  const [wishlist, setWishlist] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadAssignment();

      // Set up real-time subscription for assignment changes
      const channel = supabase
        .channel('secret-santa-assignment-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'secret_santa_assignments',
            filter: `giver_id=eq.${user.id}`,
          },
          () => {
            loadAssignment();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'secret_santa_events',
          },
          () => {
            loadAssignment();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadAssignment = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get the most recent non-completed event (matching SecretSanta page logic)
      const { data: events, error: eventsError } = await supabase
        .from('secret_santa_events')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        setAssignment(null);
        return;
      }

      if (!events || events.length === 0) {
        setAssignment(null);
        return;
      }

      const event = events[0];

      // Only show if event is assigned AND reveal is enabled
      if (event.status !== 'assigned' || !event.reveal_enabled) {
        setAssignment(null);
        return;
      }

      // Get user's assignment for this specific event
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('secret_santa_assignments')
        .select(`
          *,
          receiver:profiles!secret_santa_assignments_receiver_id_fkey(
            id,
            full_name,
            photo_url,
            department,
            position
          ),
          event:secret_santa_events(
            id,
            name,
            budget_limit
          )
        `)
        .eq('event_id', event.id)
        .eq('giver_id', user.id)
        .maybeSingle();

      if (assignmentError) {
        console.error('Error fetching assignment:', assignmentError);
        setAssignment(null);
        return;
      }

      if (!assignmentData) {
        setAssignment(null);
        return;
      }

      setAssignment(assignmentData);

      // Load receiver's wishlist for this event
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('secret_santa_wishlists')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', assignmentData.receiver_id)
        .order('priority', { ascending: true })
        .limit(3);

      if (wishlistError) {
        console.error('Error fetching wishlist:', wishlistError);
      }

      setWishlist(wishlistData || []);
    } catch (error) {
      console.error('Error loading Secret Santa assignment:', error);
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!assignment) {
    return null;
  }

  const receiver = assignment.receiver;
  const event = assignment.event;
  
  const initials = receiver?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Card className="bg-gradient-to-br from-red-50 to-green-50 dark:from-red-950 dark:to-green-950 border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-red-600 dark:text-red-400" />
          🎅 Your Secret Santa Assignment
        </CardTitle>
        <CardDescription>
          {event?.name || 'Secret Santa'} - You're the Secret Santa for...
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
          <Avatar className="h-16 w-16">
            <AvatarImage src={receiver?.photo_url} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{receiver?.full_name}</h3>
            {receiver?.position && (
              <p className="text-sm text-muted-foreground">{receiver.position}</p>
            )}
            {receiver?.department && (
              <p className="text-xs text-muted-foreground">{receiver.department}</p>
            )}
          </div>
          {event?.budget_limit && (
            <Badge variant="secondary" className="shrink-0">
              Budget: ${event.budget_limit}
            </Badge>
          )}
        </div>

        {wishlist.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Their Wishlist:</h4>
            <div className="space-y-2">
              {wishlist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 p-3 bg-card rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.item_title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {item.priority}
                      </Badge>
                    </div>
                    {item.item_description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.item_description}
                      </p>
                    )}
                  </div>
                  {item.item_url && (
                    <a
                      href={item.item_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {wishlist.length === 0 && (
          <div className="p-4 bg-muted/50 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              {receiver?.full_name} hasn't added any wishlist items yet
            </p>
          </div>
        )}

        <Button
          onClick={() => navigate('/secret-santa')}
          className="w-full"
          variant="outline"
        >
          View Full Details
        </Button>
      </CardContent>
    </Card>
  );
}
