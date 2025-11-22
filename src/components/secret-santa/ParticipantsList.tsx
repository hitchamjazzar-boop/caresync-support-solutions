import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ParticipantsListProps {
  eventId: string;
}

export function ParticipantsList({ eventId }: ParticipantsListProps) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParticipants();
  }, [eventId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secret_santa_participants')
        .select(`
          *,
          profile:profiles!secret_santa_participants_user_id_fkey(*)
        `)
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error loading participants:', error);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Participants ({participants.length})
        </CardTitle>
        <CardDescription>
          All employees who have joined the Secret Santa event
        </CardDescription>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No participants yet
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((participant) => {
              const profile = participant.profile;
              const initials = profile?.full_name
                ?.split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase() || '?';

              return (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                >
                  <Avatar>
                    <AvatarImage src={profile?.photo_url} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{profile?.full_name}</p>
                    {profile?.department && (
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.department}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Active
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
