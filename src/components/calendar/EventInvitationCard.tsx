import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Link2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventInvitationCardProps {
  event: any;
  onResponse: () => void;
}

export function EventInvitationCard({ event, onResponse }: EventInvitationCardProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRSVP = async (status: string) => {
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('calendar_event_responses')
        .upsert({
          event_id: event.id,
          user_id: user.id,
          response_status: status,
          responded_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Mark notification as acknowledged
      await supabase
        .from('notification_acknowledgments')
        .upsert({
          notification_id: event.id,
          notification_type: 'calendar_invitation',
          user_id: user.id,
          acknowledged_at: new Date().toISOString(),
        });

      toast.success(`You ${status} the invitation`);
      onResponse();
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update response');
    } finally {
      setLoading(false);
    }
  };

  const eventTypeColors: Record<string, string> = {
    appointment: '#3b82f6',
    project: '#8b5cf6',
    event: '#3b82f6',
    reminder: '#f59e0b',
    birthday: '#ec4899',
    holiday: '#dc2626',
    meeting: '#10b981',
  };

  const eventTypeLabels: Record<string, string> = {
    appointment: 'Appointment',
    project: 'Project',
    event: 'Event',
    reminder: 'Reminder',
    birthday: 'Birthday',
    holiday: 'Holiday',
    meeting: 'Meeting',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <Badge
                className="mt-1"
                style={{ backgroundColor: eventTypeColors[event.event_type] || '#3b82f6' }}
              >
                {eventTypeLabels[event.event_type] || event.event_type}
              </Badge>
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(event.start_time), 'MMMM d, yyyy')}</span>
            </div>

            {!event.all_day && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(event.start_time), 'h:mm a')} -{' '}
                  {format(new Date(event.end_time), 'h:mm a')}
                </span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{event.location}</span>
              </div>
            )}

            {event.meeting_link && (
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <a
                  href={event.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Join Meeting
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 border-t pt-4">
        <Button
          size="sm"
          onClick={() => handleRSVP('accepted')}
          disabled={loading}
          className="flex-1"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleRSVP('tentative')}
          disabled={loading}
          className="flex-1"
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Maybe
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => handleRSVP('declined')}
          disabled={loading}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Decline
        </Button>
      </CardFooter>
    </Card>
  );
}