import { useState, useEffect } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, User, Trash2, Link2, Users, Repeat, CheckCircle2, XCircle, Clock as ClockPending, AlertCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [attendees, setAttendees] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [userResponse, setUserResponse] = useState<any>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedCopyTarget, setSelectedCopyTarget] = useState<string>('');

  useEffect(() => {
    if (event && open) {
      fetchAttendees();
      fetchEmployees();
    }
  }, [open, event?.id]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAttendees = async () => {
    if (!event?.target_users || event.target_users.length === 0) return;

    try {
      // Fetch attendee profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position')
        .in('id', event.target_users);

      if (profilesError) throw profilesError;

      // Fetch RSVP responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('calendar_event_responses')
        .select('*')
        .eq('event_id', event.id);

      if (responsesError) throw responsesError;

      setAttendees(profilesData || []);
      setResponses(responsesData || []);
      
      // Find current user's response
      const myResponse = responsesData?.find(r => r.user_id === user?.id);
      setUserResponse(myResponse);
    } catch (error: any) {
      console.error('Error fetching attendees:', error);
    }
  };

  const handleRSVP = async (status: string) => {
    if (!user || !event) return;

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

      toast.success(`You ${status} the invitation`);
      fetchAttendees();
    } catch (error: any) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update response');
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const canEdit = isAdmin || event.created_by === user?.id;
  const isInvited = event.target_users?.includes(user?.id);

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

  const handleCopyEvent = async () => {
    if (!selectedCopyTarget || !user) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setLoading(true);

      // Create a copy of the event for the target employee
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          description: event.description ? `${event.description}\n\n[Copied from original event]` : '[Copied from original event]',
          event_type: event.event_type,
          start_time: event.start_time,
          end_time: event.end_time,
          all_day: event.all_day,
          location: event.location,
          meeting_link: event.meeting_link,
          color: event.color,
          created_by: user.id,
          is_public: false,
          target_users: [selectedCopyTarget],
          is_recurring: event.is_recurring,
          recurrence_pattern: event.recurrence_pattern,
          recurrence_end_date: event.recurrence_end_date,
        });

      if (error) throw error;

      toast.success('Event copied successfully');
      setCopyDialogOpen(false);
      setSelectedCopyTarget('');
      onUpdate();
    } catch (error: any) {
      console.error('Error copying event:', error);
      toast.error('Failed to copy event');
    } finally {
      setLoading(false);
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

  const getResponseIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'tentative':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <ClockPending className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAttendeeResponse = (attendeeId: string) => {
    return responses.find(r => r.user_id === attendeeId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

              {event.meeting_link && (
                <div className="flex items-center gap-2 text-sm">
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

              {event.is_recurring && (
                <div className="flex items-center gap-2 text-sm">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span>Recurring: {event.recurrence_pattern}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{event.is_public ? 'Visible to all employees' : 'Private event'}</span>
              </div>
            </div>

            {/* Attendees Section */}
            {attendees.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Attendees ({attendees.length})
                </h4>
                <div className="space-y-2">
                  {attendees.map(attendee => {
                    const response = getAttendeeResponse(attendee.id);
                    return (
                      <div key={attendee.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={attendee.photo_url} />
                          <AvatarFallback>{attendee.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{attendee.full_name}</div>
                          {attendee.position && (
                            <div className="text-xs text-muted-foreground">{attendee.position}</div>
                          )}
                        </div>
                        {response && (
                          <div className="flex items-center gap-1">
                            {getResponseIcon(response.response_status)}
                            <span className="text-xs capitalize">{response.response_status}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => setCopyDialogOpen(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Event
            </Button>
            {event.meeting_link && (
              <Button asChild>
                <a href={event.meeting_link} target="_blank" rel="noopener noreferrer">
                  <Link2 className="h-4 w-4 mr-2" />
                  Join Meeting
                </a>
              </Button>
            )}
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

      {/* Copy Event Dialog */}
      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy Event to Employee Calendar</AlertDialogTitle>
            <AlertDialogDescription>
              Select an employee to copy this event to their calendar.
              {event.is_recurring && ' The copied event will maintain the same recurring pattern.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedCopyTarget} onValueChange={setSelectedCopyTarget}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={emp.photo_url} />
                        <AvatarFallback>{emp.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{emp.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCopyEvent}
              disabled={loading || !selectedCopyTarget}
            >
              {loading ? 'Copying...' : 'Copy Event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}