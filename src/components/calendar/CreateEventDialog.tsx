import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Link2, Users, Calendar as CalendarIcon, Repeat } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledData?: {
    employeeId?: string;
    startTime?: string;
    endTime?: string;
  };
}

const eventTypeColors = {
  appointment: '#3b82f6',
  project: '#8b5cf6',
  event: '#3b82f6',
  reminder: '#f59e0b',
  birthday: '#ec4899',
  holiday: '#dc2626',
  meeting: '#10b981',
};

const recurrencePatterns = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly (every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const weekDays = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
];

export function CreateEventDialog({ open, onOpenChange, onSuccess, prefilledData }: CreateEventDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'event',
    start_time: prefilledData?.startTime || '',
    end_time: prefilledData?.endTime || '',
    all_day: false,
    location: '',
    meeting_link: '',
    is_public: true,
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_end_date: '',
  });

  // Helper to convert local time to UTC ISO string
  const toUtcIso = (value: string | null | undefined) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  };
 
  useEffect(() => {
    if (open) {
      setMounted(false);
      fetchEmployees();
      
      // Consolidate all initial state updates
      const updates: any = {};
      let hasUpdates = false;
      
      if (prefilledData?.employeeId) {
        setSelectedAttendees([prefilledData.employeeId]);
        // When creating event for specific person, default to private
        updates.is_public = false;
        hasUpdates = true;
      }
      
      if (prefilledData?.startTime) {
        const startDateTime = new Date(prefilledData.startTime);
        const endDateTime = prefilledData.endTime ? new Date(prefilledData.endTime) : startDateTime;
        
        setStartDate(startDateTime);
        setEndDate(endDateTime);
        updates.start_time = prefilledData.startTime;
        updates.end_time = prefilledData.endTime || prefilledData.startTime;
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
      
      // Delay mounting of Popovers to prevent ref conflicts
      setTimeout(() => setMounted(true), 100);
    } else {
      setMounted(false);
    }
  }, [open, prefilledData?.employeeId, prefilledData?.startTime, prefilledData?.endTime]);

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

  const toggleAttendee = (employeeId: string) => {
    setSelectedAttendees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Build recurrence pattern string
      let recurrencePatternStr = formData.recurrence_pattern;
      if (formData.is_recurring && formData.recurrence_pattern === 'weekly' && selectedDays.length > 0) {
        recurrencePatternStr = `weekly:${selectedDays.join(',')}`;
      }

      // Ensure creator is included in target_users if this was for a specific employee
      let attendees = selectedAttendees;
      if (attendees.length > 0 && !attendees.includes(user.id)) {
        attendees = [...attendees, user.id];
      }

      const eventData: any = {
        ...formData,
        start_time: toUtcIso(formData.start_time)!,
        end_time: toUtcIso(formData.end_time)!,
        // If there are explicit attendees, make event private by default
        is_public: attendees.length === 0 ? formData.is_public : false,
        recurrence_pattern: formData.is_recurring ? recurrencePatternStr : null,
        recurrence_end_date:
          formData.is_recurring && formData.recurrence_end_date
            ? toUtcIso(formData.recurrence_end_date)
            : null,
        color: eventTypeColors[formData.event_type as keyof typeof eventTypeColors] || '#3b82f6',
        created_by: user.id,
        target_users: attendees.length > 0 ? attendees : null,
      };

      const { data: newEvent, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      // Create RSVP records for all attendees
      if (attendees.length > 0 && newEvent) {
        const responses = attendees.map(attendeeId => ({
          event_id: newEvent.id,
          user_id: attendeeId,
          response_status: 'pending',
        }));

        const { error: rsvpError } = await supabase
          .from('calendar_event_responses')
          .insert(responses);

        if (rsvpError) throw rsvpError;

        // Create notifications for attendees
        const notifications = attendees
          .filter(id => id !== user.id)
          .map(attendeeId => ({
            notification_id: newEvent.id,
            notification_type: 'calendar_invitation',
            user_id: attendeeId,
          }));

        if (notifications.length > 0) {
          await supabase
            .from('notification_acknowledgments')
            .insert(notifications);
        }
      }

      toast.success('Event created successfully' + (attendees.length > 0 ? ' and invitations sent' : ''));
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'event',
      start_time: '',
      end_time: '',
      all_day: false,
      location: '',
      meeting_link: '',
      is_public: true,
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_end_date: '',
    });
    setSelectedAttendees([]);
    setSelectedDays([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Add a new event and invite team members
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event_type">Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_link">
                <Link2 className="h-4 w-4 inline mr-1" />
                Meeting Link
              </Label>
              <Input
                id="meeting_link"
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date & Time *</Label>
              <div className="flex gap-2">
                {mounted ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          if (date && formData.start_time) {
                            const time = formData.start_time.split('T')[1] || '09:00';
                            const newDateTime = `${format(date, 'yyyy-MM-dd')}T${time}`;
                            setFormData({ ...formData, start_time: newDateTime });
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left font-normal text-muted-foreground"
                    disabled
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Loading...</span>
                  </Button>
                )}
                <Input
                  type="time"
                  value={formData.start_time.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                    setFormData({ ...formData, start_time: `${date}T${e.target.value}` });
                  }}
                  className="w-32"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>End Date & Time *</Label>
              <div className="flex gap-2">
                {mounted ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          if (date && formData.end_time) {
                            const time = formData.end_time.split('T')[1] || '10:00';
                            const newDateTime = `${format(date, 'yyyy-MM-dd')}T${time}`;
                            setFormData({ ...formData, end_time: newDateTime });
                          }
                        }}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left font-normal text-muted-foreground"
                    disabled
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Loading...</span>
                  </Button>
                )}
                <Input
                  type="time"
                  value={formData.end_time.split('T')[1] || ''}
                  onChange={(e) => {
                    const date = endDate ? format(endDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                    setFormData({ ...formData, end_time: `${date}T${e.target.value}` });
                  }}
                  className="w-32"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Event location"
            />
          </div>

          {/* Recurring Event Section */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_recurring" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Recurring Event
              </Label>
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-3 pl-6 border-l-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern">Repeat Pattern</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrencePatterns.map(pattern => (
                        <SelectItem key={pattern.value} value={pattern.value}>
                          {pattern.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.recurrence_pattern === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Repeat on</Label>
                    <div className="flex flex-wrap gap-2">
                      {weekDays.map(day => (
                        <Badge
                          key={day.value}
                          variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recurrence_end_date">End Date (optional)</Label>
                  <Input
                    id="recurrence_end_date"
                    type="date"
                    value={formData.recurrence_end_date}
                    onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty for no end date</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between space-x-2 border-t pt-4">
            <Label htmlFor="all_day">All Day Event</Label>
            <Switch
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="is_public">Visible to All Employees</Label>
            <Switch
              id="is_public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}