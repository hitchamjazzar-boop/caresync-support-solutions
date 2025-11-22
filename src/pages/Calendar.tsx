import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, setHours, setMinutes, isSameDay, addDays, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailsDialog } from '@/components/calendar/EventDetailsDialog';
import { EmployeeSelector } from '@/components/calendar/EmployeeSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  meeting_link: string;
  color: string;
  created_by: string;
  is_public: boolean;
  target_users: string[];
  is_recurring: boolean;
  recurrence_pattern: string;
}

type ViewMode = 'day' | 'week';

export default function Calendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragOver, setDragOver] = useState<{ employeeId: string; day: Date; slotIndex: number } | null>(null);
  const [prefilledData, setPrefilledData] = useState<any>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const displayDays = viewMode === 'day' 
    ? [startOfDay(currentDate)]
    : eachDayOfInterval({ start: weekStart, end: weekEnd });

  // 15-minute slots from 6am to 6pm
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 4) + 6;
    const minute = (i % 4) * 15;
    return { 
      hour, 
      minute, 
      label: i % 4 === 0 ? format(setMinutes(setHours(new Date(), hour), minute), 'h:mm a') : '' 
    };
  });

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEmployees.length > 0) {
      fetchEvents();

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
  }, [selectedEmployees, currentDate, viewMode]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
      
      if (user && data) {
        setSelectedEmployees([user.id]);
      }
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);

      const startDate = viewMode === 'day' ? startOfDay(currentDate) : weekStart;
      const endDate = viewMode === 'day' ? addDays(startDate, 1) : weekEnd;

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      const filteredEvents = (data || []).filter(event => {
        if (event.is_public) return true;
        if (!event.target_users) return false;
        return selectedEmployees.some(empId => event.target_users.includes(empId));
      });

      setEvents(filteredEvents);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelectionChange = (employeeIds: string[]) => {
    // Enforce limits
    if (viewMode === 'week' && employeeIds.length > 3) {
      toast.error('Week view is limited to 3 employees. Switch to Day view for more.');
      return;
    }
    setSelectedEmployees(employeeIds);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'week' && selectedEmployees.length > 3) {
      toast.error('Week view is limited to 3 employees. Please select fewer employees.');
      return;
    }
    setViewMode(mode);
  };

  const handleSlotClick = (employeeId: string, day: Date, slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    const startTime = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    setPrefilledData({
      employeeId,
      startTime: startTime.toISOString().slice(0, 16),
      endTime: endTime.toISOString().slice(0, 16),
    });
    setCreateDialogOpen(true);
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, employeeId: string, day: Date, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver({ employeeId, day, slotIndex });
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent, employeeId: string, day: Date, slotIndex: number) => {
    e.preventDefault();
    setDragOver(null);

    if (!draggedEvent) return;

    try {
      const slot = timeSlots[slotIndex];
      const newStartTime = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
      
      // Calculate duration of original event
      const originalStart = new Date(draggedEvent.start_time);
      const originalEnd = new Date(draggedEvent.end_time);
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      
      // Apply same duration to new start time
      const newEndTime = new Date(newStartTime.getTime() + durationMs);

      // Update target_users to include the new employee if not already
      let newTargetUsers = draggedEvent.target_users || [];
      if (!newTargetUsers.includes(employeeId)) {
        newTargetUsers = [employeeId];
      }

      const { error } = await supabase
        .from('calendar_events')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
          target_users: newTargetUsers,
        })
        .eq('id', draggedEvent.id);

      if (error) throw error;

      toast.success('Event moved successfully');
      fetchEvents();
    } catch (error: any) {
      console.error('Error moving event:', error);
      toast.error('Failed to move event');
    } finally {
      setDraggedEvent(null);
    }
  };

  const getEventsForEmployeeSlot = (employeeId: string, day: Date, slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    const slotStart = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      const isForEmployee = event.is_public || event.target_users?.includes(employeeId);
      
      return isForEmployee && (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );
    });
  };

  const calculateEventHeight = (event: CalendarEvent) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const slots = Math.ceil(durationMinutes / 15);
    return Math.max(slots, 1);
  };

  const getEmployeeColor = (index: number) => {
    const colors = [
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200',
      'bg-purple-50 border-purple-200',
      'bg-orange-50 border-orange-200',
      'bg-pink-50 border-pink-200',
      'bg-yellow-50 border-yellow-200',
      'bg-indigo-50 border-indigo-200',
    ];
    return colors[index % colors.length];
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
    } else if (direction === 'prev') {
      setCurrentDate(viewMode === 'day' ? addDays(currentDate, -1) : subWeeks(currentDate, 1));
    } else {
      setCurrentDate(viewMode === 'day' ? addDays(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  if (loading && selectedEmployees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedEmployeeData = employees.filter(e => selectedEmployees.includes(e.id));
  const dateRangeText = viewMode === 'day'
    ? format(currentDate, 'MMMM d, yyyy')
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Team Calendar
          </h1>
          <p className="text-muted-foreground mt-2">
            Schedule and view team availability
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={viewMode} onValueChange={(v) => handleViewModeChange(v as ViewMode)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
            </SelectContent>
          </Select>
          <EmployeeSelector
            selectedEmployees={selectedEmployees}
            onSelectionChange={handleEmployeeSelectionChange}
          />
          <Button onClick={() => {
            setPrefilledData(null);
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {selectedEmployees.length > 3 && viewMode === 'week' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Week view is limited to 3 employees. Please select fewer employees or switch to Day view.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl">{dateRangeText}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => handleNavigate('today')}>
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedEmployeeData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Select employees to view their calendars
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <div className="min-w-max">
                {/* Header with Days and Employees */}
                <div className="sticky top-0 z-20 bg-background border-b">
                  <div className="grid" style={{ 
                    gridTemplateColumns: `80px repeat(${displayDays.length}, minmax(${selectedEmployeeData.length * 120}px, 1fr))` 
                  }}>
                    <div className="p-2 text-xs font-medium text-muted-foreground border-r bg-muted/50">
                      Time
                    </div>
                    {displayDays.map(day => (
                      <div
                        key={day.toISOString()}
                        className={`border-r last:border-r-0 ${isToday(day) ? 'bg-primary/5' : 'bg-muted/50'}`}
                      >
                        <div className="p-2 text-center border-b">
                          <div className="text-xs font-medium text-muted-foreground">
                            {format(day, 'EEE')}
                          </div>
                          <div className={`text-lg font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                            {format(day, 'd')}
                          </div>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${selectedEmployeeData.length}, 1fr)` }}>
                          {selectedEmployeeData.map((employee, empIdx) => (
                            <div
                              key={employee.id}
                              className={`p-2 text-center text-xs font-medium border-r last:border-r-0 truncate ${getEmployeeColor(empIdx)}`}
                              title={employee.full_name}
                            >
                              {employee.full_name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Grid */}
                <div className="max-h-[600px] overflow-y-auto">
                  {timeSlots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="grid"
                      style={{ 
                        gridTemplateColumns: `80px repeat(${displayDays.length}, minmax(${selectedEmployeeData.length * 120}px, 1fr))`,
                        minHeight: '40px'
                      }}
                    >
                      <div className="p-1 text-xs text-muted-foreground border-r border-b sticky left-0 bg-background z-10">
                        {slot.label}
                      </div>
                      {displayDays.map(day => (
                        <div key={`${day.toISOString()}-${slotIndex}`} className="border-r border-b last:border-r-0">
                          <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${selectedEmployeeData.length}, 1fr)` }}>
                            {selectedEmployeeData.map((employee, empIdx) => {
                              const slotEvents = getEventsForEmployeeSlot(employee.id, day, slotIndex);
                              const isFirstSlotForEvent = (event: CalendarEvent) => {
                                const eventStart = new Date(event.start_time);
                                const slotStart = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
                                return Math.abs(eventStart.getTime() - slotStart.getTime()) < 15 * 60 * 1000;
                              };
                              const isDragOverSlot = dragOver?.employeeId === employee.id && 
                                                      isSameDay(dragOver.day, day) && 
                                                      dragOver.slotIndex === slotIndex;

                              return (
                                <div
                                  key={`${employee.id}-${slotIndex}`}
                                  className={`h-10 ${getEmployeeColor(empIdx)} hover:bg-accent/50 cursor-pointer transition-colors border-r last:border-r-0 relative ${
                                    isDragOverSlot ? 'ring-2 ring-primary ring-inset' : ''
                                  }`}
                                  onClick={() => handleSlotClick(employee.id, day, slotIndex)}
                                  onDragOver={(e) => handleDragOver(e, employee.id, day, slotIndex)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, employee.id, day, slotIndex)}
                                >
                                  {slotEvents.filter(isFirstSlotForEvent).map(event => {
                                    const height = calculateEventHeight(event);
                                    return (
                                      <div
                                        key={event.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, event)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedEvent(event);
                                          setDetailsDialogOpen(true);
                                        }}
                                        className="absolute inset-x-0 text-xs p-1 rounded text-white truncate hover:opacity-90 transition-opacity z-10 cursor-move"
                                        style={{
                                          backgroundColor: event.color,
                                          height: `${height * 40}px`,
                                        }}
                                        title={`${event.title} - Drag to move`}
                                      >
                                        <div className="font-medium truncate">{event.title}</div>
                                        {event.location && height > 1 && (
                                          <div className="text-[10px] opacity-90 truncate">{event.location}</div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          {selectedEmployeeData.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm font-medium text-muted-foreground">Employees:</span>
                {selectedEmployeeData.map((employee, idx) => (
                  <Badge
                    key={employee.id}
                    variant="outline"
                    className={`${getEmployeeColor(idx)}`}
                  >
                    {employee.full_name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateEventDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchEvents();
          setCreateDialogOpen(false);
          setPrefilledData(null);
        }}
        prefilledData={prefilledData}
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