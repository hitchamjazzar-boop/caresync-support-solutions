import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, DollarSign, Users, UserPlus, UserMinus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EventCardProps {
  event: any;
  participation: any;
  onUpdate: () => void;
}

export function EventCard({ event, participation, onUpdate }: EventCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'open': return 'default';
      case 'assigned': return 'default';
      case 'completed': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Coming Soon';
      case 'open': return 'Open for Registration';
      case 'assigned': return 'Assignments Made';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    
    setJoining(true);
    try {
      const { error } = await supabase
        .from('secret_santa_participants')
        .insert({
          event_id: event.id,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: 'You have joined the Secret Santa event.',
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!user || !participation) return;
    
    setLeaving(true);
    try {
      const { error } = await supabase
        .from('secret_santa_participants')
        .delete()
        .eq('id', participation.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'You have left the Secret Santa event.',
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              {event.name}
            </CardTitle>
            <CardDescription className="mt-2">
              {event.description}
            </CardDescription>
          </div>
          <Badge variant={getStatusColor(event.status)}>
            {getStatusLabel(event.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Exchange: {format(new Date(event.end_date), 'MMM dd, yyyy')}
            </span>
          </div>
          {event.budget_limit && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Budget: ${event.budget_limit}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {participation ? 'You are participating' : 'Not joined yet'}
            </span>
          </div>
        </div>

        {event.status === 'open' && (
          <div className="pt-4 border-t">
            {!participation ? (
              <Button 
                onClick={handleJoin} 
                disabled={joining}
                className="w-full md:w-auto"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {joining ? 'Joining...' : 'Join Secret Santa'}
              </Button>
            ) : (
              <Button 
                onClick={handleLeave} 
                disabled={leaving}
                variant="outline"
                className="w-full md:w-auto"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {leaving ? 'Leaving...' : 'Leave Event'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
