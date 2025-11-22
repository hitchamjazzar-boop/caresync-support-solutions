import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isToday, startOfDay, endOfDay, addDays } from 'date-fns';
import { toast } from 'sonner';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailsDialog } from '@/components/calendar/EventDetailsDialog';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  color: string;
  created_by: string;
  is_public: boolean;
}

export default function Calendar() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = Array.from({ length: 13 }, (_, i) => i + 6); // 6am to 6pm

  useEffect(() => {
    if (user) {
      fetchEvents();

      // Set up real-time subscription
      const channel = supabase
        .channel('calendar-events-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calendar_events',
          },
          () => {
            fetchEvents();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, currentWeek]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch calendar events
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', weekStart.toISOString())
        .lte('end_time', weekEnd.toISOString())
        .order('start_time', { ascending: true });

      if (calendarError) throw calendarError;

      // Fetch birthdays from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, birthday')
        .not('birthday', 'is', null);

      if (profilesError) throw profilesError;

      // Convert birthdays to calendar events
      const birthdayEvents: CalendarEvent[] = (profilesData || [])
        .filter(profile => {
          if (!profile.birthday) return false;
          const birthday = new Date(profile.birthday);
          const thisYearBirthday = new Date(currentWeek.getFullYear(), birthday.getMonth(), birthday.getDate());
          return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
        })
        .map(profile => {
          const birthday = new Date(profile.birthday!);
          const thisYearBirthday = new Date(currentWeek.getFullYear(), birthday.getMonth(), birthday.getDate());
          return {
            id: `birthday-${profile.id}`,
            title: `🎂 ${profile.full_name}'s Birthday`,
            description: `Happy Birthday to ${profile.full_name}!`,
            event_type: 'birthday',
            start_time: thisYearBirthday.toISOString(),
            end_time: thisYearBirthday.toISOString(),
            all_day: true,
            location: '',
            color: '#ec4899',
            created_by: 'system',
            is_public: true,
          };
        });

      setEvents([...(calendarData || []), ...birthdayEvents]);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    const slotStart = new Date(day);
    slotStart.setHours(hour, 0, 0, 0);
    const slotEnd = new Date(day);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    return events.filter((event) => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      return (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );
    });
  };

  const getAllDayEvents = (day: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return event.all_day && isSameDay(eventDate, day);
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Company Calendar
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage appointments, events, and important dates
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={handleToday}>
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-8 border-b bg-muted/50">
              <div className="p-2 text-xs font-medium text-muted-foreground border-r">
                Time
              </div>
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`p-2 text-center border-r last:border-r-0 ${
                    isToday(day) ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isToday(day) ? 'text-primary' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                  
                  {/* All-day events */}
                  {getAllDayEvents(day).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {getAllDayEvents(day).map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className="w-full text-xs p-1 rounded text-white truncate hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="max-h-[600px] overflow-y-auto">
              {timeSlots.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                  <div className="p-2 text-xs text-muted-foreground border-r">
                    {format(new Date().setHours(hour, 0), 'h:mm a')}
                  </div>
                  {weekDays.map((day) => {
                    const slotEvents = getEventsForTimeSlot(day, hour);
                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className="min-h-[60px] p-1 border-r last:border-r-0 hover:bg-muted/30 transition-colors"
                      >
                        {slotEvents.map((event) => (
                          <button
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="w-full text-xs p-1 mb-1 rounded text-white truncate hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: event.color }}
                          >
                            <div className="font-medium">{event.title}</div>
                            {event.location && (
                              <div className="text-[10px] opacity-90">{event.location}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-sm">Event</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
              <span className="text-sm">Meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
              <span className="text-sm">Reminder</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ec4899' }} />
              <span className="text-sm">Birthday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
              <span className="text-sm">Project</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchEvents();
          setCreateDialogOpen(false);
        }}
      />

      <EventDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        event={selectedEvent}
        onUpdate={fetchEvents}
        onDelete={() => {
          fetchEvents();
          setDetailsDialogOpen(false);
        }}
      />
    </div>
  );
}