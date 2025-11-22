import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  onUpdate: () => void;
  onDelete: () => void;
}

export function EventDetailsDialog({
  open,
  onOpenChange,
  event,
  onUpdate,
  onDelete,
}: EventDetailsDialogProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!event) return null;

  const canEdit = isAdmin || event.created_by === user?.id;

  const handleDelete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Event deleted successfully');
      onDelete();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{event.title}</DialogTitle>
                <Badge className="mt-2" style={{ backgroundColor: event.color }}>
                  {eventTypeLabels[event.event_type] || event.event_type}
                </Badge>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {event.description && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{event.description}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.all_day ? (
                    <span>All Day - {format(new Date(event.start_time), 'MMMM d, yyyy')}</span>
                  ) : (
                    <span>
                      {format(new Date(event.start_time), 'MMMM d, yyyy')}
                    </span>
                  )}
                </span>
              </div>

              {!event.all_day && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(event.start_time), 'h:mm a')} -{' '}
                    {format(new Date(event.end_time), 'h:mm a')}
                  </span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{event.is_public ? 'Visible to all employees' : 'Private event'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}