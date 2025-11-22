import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Gift } from 'lucide-react';
import { EventCard } from '@/components/secret-santa/EventCard';
import { WishlistManager } from '@/components/secret-santa/WishlistManager';
import { AssignmentReveal } from '@/components/secret-santa/AssignmentReveal';
import { AdminControls } from '@/components/secret-santa/AdminControls';
import { ParticipantsList } from '@/components/secret-santa/ParticipantsList';

export default function SecretSanta() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [participation, setParticipation] = useState<any>(null);
  const [assignment, setAssignment] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadActiveEvent();
    }
  }, [user]);

  const loadActiveEvent = async () => {
    try {
      setLoading(true);

      // Get the most recent non-completed event
      const { data: events, error: eventError } = await supabase
        .from('secret_santa_events')
        .select('*')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (eventError) throw eventError;

      if (events && events.length > 0) {
        const event = events[0];
        setActiveEvent(event);

        // Check if user is participating
        const { data: participantData } = await supabase
          .from('secret_santa_participants')
          .select('*')
          .eq('event_id', event.id)
          .eq('user_id', user?.id)
          .maybeSingle();

        setParticipation(participantData);

        // If event is assigned, try to get the user's assignment
        if (event.status === 'assigned' && participantData) {
          const { data: assignmentData } = await supabase
            .from('secret_santa_assignments')
            .select(`
              *,
              receiver:profiles!secret_santa_assignments_receiver_id_fkey(*)
            `)
            .eq('event_id', event.id)
            .eq('giver_id', user?.id)
            .maybeSingle();

          setAssignment(assignmentData);
        }
      } else {
        setActiveEvent(null);
        setParticipation(null);
        setAssignment(null);
      }
    } catch (error) {
      console.error('Error loading Secret Santa event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeEvent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Secret Santa</h1>
          <p className="text-muted-foreground">
            Join the fun of Secret Santa gift exchange!
          </p>
        </div>

        {isAdmin ? (
          <AdminControls onEventCreated={loadActiveEvent} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                No Active Event
              </CardTitle>
              <CardDescription>
                There is no active Secret Santa event at the moment. Check back later!
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Secret Santa</h1>
        <p className="text-muted-foreground">
          Join the fun of Secret Santa gift exchange!
        </p>
      </div>

      <EventCard 
        event={activeEvent} 
        participation={participation}
        onUpdate={loadActiveEvent}
      />

      {participation && (
        <>
          <WishlistManager 
            eventId={activeEvent.id}
            userId={user?.id || ''}
          />

          {assignment && activeEvent.reveal_enabled && (
            <AssignmentReveal 
              assignment={assignment}
              eventId={activeEvent.id}
            />
          )}
        </>
      )}

      {isAdmin && (
        <>
          <AdminControls 
            event={activeEvent}
            onEventUpdated={loadActiveEvent}
          />
          <ParticipantsList eventId={activeEvent.id} />
        </>
      )}
    </div>
  );
}
