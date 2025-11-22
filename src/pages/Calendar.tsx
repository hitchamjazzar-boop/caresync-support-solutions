import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, setHours, setMinutes, isSameDay, addDays, startOfDay, getHours, getMinutes } from 'date-fns';
import { toast } from 'sonner';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailsDialog } from '@/components/calendar/EventDetailsDialog';
import { EmployeeSelector } from '@/components/calendar/EmployeeSelector';
import { EventContextMenu } from '@/components/calendar/EventContextMenu';
import { MoveConfirmDialog } from '@/components/calendar/MoveConfirmDialog';
import { ParticipantIndicators } from '@/components/calendar/ParticipantIndicators';
import { UpcomingReminders } from '@/components/calendar/UpcomingReminders';
import { CalendarBanner } from '@/components/calendar/CalendarBanner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DatePicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
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
  recurrence_end_date: string | null;
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
  const [resizingEvent, setResizingEvent] = useState<{ event: CalendarEvent; direction: 'top' | 'bottom' } | null>(null);
  const [dragOver, setDragOver] = useState<{ employeeId: string; day: Date; slotIndex: number } | null>(null);
  const [hoverSlot, setHoverSlot] = useState<{ employeeId: string; day: Date; slotIndex: number; startIndex: number } | null>(null);
  const [prefilledData, setPrefilledData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dragSelection, setDragSelection] = useState<{ employeeId: string; day: Date; startIndex: number; endIndex: number } | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ event: CalendarEvent; employeeId: string; day: Date; slotIndex: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const displayDays = viewMode === 'day' 
    ? [startOfDay(currentDate)]
    : eachDayOfInterval({ start: weekStart, end: weekEnd });

  // 15-minute slots from 6am to 10pm (16 hours = 64 slots)
  const timeSlots = Array.from({ length: 64 }, (_, i) => {
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

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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
        .select('id, full_name, photo_url, position, calendar_color')
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

  // Helper function to expand recurring events into individual instances
  const expandRecurringEvents = (events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] => {
    const expanded: CalendarEvent[] = [];

    events.forEach(event => {
      if (!event.is_recurring || !event.recurrence_pattern) {
        // Non-recurring event, add as-is
        expanded.push(event);
        return;
      }

      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      const duration = eventEnd.getTime() - eventStart.getTime();
      const recurrenceEndDate = event.recurrence_end_date 
        ? new Date(event.recurrence_end_date) 
        : new Date(endDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year from end if no end date

      // Parse recurrence pattern
      const [pattern, daysStr] = event.recurrence_pattern.split(':');
      const selectedDays = daysStr ? daysStr.split(',') : [];

      let currentDate = new Date(eventStart);
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6
      };

      const endDateTimestamp = Math.min(recurrenceEndDate.getTime(), endDate.getTime());
      const startDateTimestamp = startDate.getTime();

      // Generate instances
      while (currentDate.getTime() <= endDateTimestamp) {
        if (currentDate.getTime() >= startDateTimestamp) {
          const instanceStart = new Date(currentDate);
          const instanceEnd = new Date(currentDate.getTime() + duration);

          // For weekly pattern with specific days, check if current day matches
          if (pattern === 'weekly' && selectedDays.length > 0) {
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][instanceStart.getDay()];
            if (selectedDays.includes(dayName)) {
              expanded.push({
                ...event,
                id: `${event.id}_${instanceStart.getTime()}`, // Unique ID for each instance
                start_time: instanceStart.toISOString(),
                end_time: instanceEnd.toISOString(),
              });
            }
          } else {
            // Add instance for other patterns
            expanded.push({
              ...event,
              id: `${event.id}_${instanceStart.getTime()}`,
              start_time: instanceStart.toISOString(),
              end_time: instanceEnd.toISOString(),
            });
          }
        }

        // Increment based on pattern
        switch (pattern) {
          case 'daily':
            currentDate = addDays(currentDate, 1);
            break;
          case 'weekly':
            currentDate = addDays(currentDate, selectedDays.length > 0 ? 1 : 7);
            break;
          case 'biweekly':
            currentDate = addDays(currentDate, 14);
            break;
          case 'monthly':
            currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
            break;
          case 'yearly':
            currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
            break;
          default:
            currentDate = addDays(currentDate, 1);
        }
      }
    });

    return expanded;
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

      // Show all events to all employees (shared visibility)
      // Filter by selected employees only
      const filteredEvents = (data || []).filter(event => {
        // If event has target_users, only show if one of selected employees is targeted
        if (event.target_users && event.target_users.length > 0) {
          return selectedEmployees.some(empId => event.target_users.includes(empId));
        }
        // Public events with no specific targets are shown to everyone
        return true;
      });

      // Expand recurring events into individual instances
      const expandedEvents = expandRecurringEvents(filteredEvents, startDate, endDate);

      setEvents(expandedEvents);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelectionChange = (employeeIds: string[]) => {
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
      startTime: formatDateTimeLocal(startTime),
      endTime: formatDateTimeLocal(endTime),
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

    // Check if this is a multi-participant event
    if (draggedEvent.target_users && draggedEvent.target_users.length > 1) {
      setPendingMove({ event: draggedEvent, employeeId, day, slotIndex });
      setMoveConfirmOpen(true);
      setDraggedEvent(null);
      return;
    }

    // Single participant - proceed with move
    await executeMoveEvent(draggedEvent, employeeId, day, slotIndex, false);
  };

  const executeMoveEvent = async (
    event: CalendarEvent,
    employeeId: string,
    day: Date,
    slotIndex: number,
    createSeparate: boolean
  ) => {
    try {
      const slot = timeSlots[slotIndex];
      const newStartTime = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
      
      const originalStart = new Date(event.start_time);
      const originalEnd = new Date(event.end_time);
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      
      const newEndTime = new Date(newStartTime.getTime() + durationMs);

      // Check for conflicts
      const conflicts = detectConflicts(event.id, employeeId, newStartTime, newEndTime);
      if (conflicts.length > 0) {
        toast.error(`Conflict detected with ${conflicts.length} existing event(s)`, {
          description: 'The selected time overlaps with another event',
        });
        return;
      }

      if (createSeparate) {
        // Create a new event for the target employee
        const { error } = await supabase
          .from('calendar_events')
          .insert({
            ...event,
            id: undefined,
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
            target_users: [employeeId],
            description: `${event.description || ''}\n\n[Split from multi-participant event]`,
          });

        if (error) throw error;
        toast.success('Separate event created');
      } else {
        // Update existing event for all participants
        let newTargetUsers = event.target_users || [];
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
          .eq('id', event.id);

        if (error) throw error;
        toast.success('Event moved successfully');
      }

      fetchEvents();
    } catch (error: any) {
      console.error('Error moving event:', error);
      toast.error('Failed to move event');
    }
  };

  const detectConflicts = (eventId: string, employeeId: string, startTime: Date, endTime: Date) => {
    return events.filter(e => 
      e.id !== eventId &&
      e.target_users?.includes(employeeId) &&
      new Date(e.start_time) < endTime &&
      new Date(e.end_time) > startTime
    );
  };

  const handleResizeStart = (e: React.MouseEvent, event: CalendarEvent, direction: 'top' | 'bottom') => {
    e.stopPropagation();
    e.preventDefault();
    setResizingEvent({ event, direction });
    setDraggedEvent(null); // Ensure we're not also dragging
  };

  const handleResizeMove = (e: React.MouseEvent, employeeId: string, day: Date, slotIndex: number) => {
    if (!resizingEvent) return;

    const slot = timeSlots[slotIndex];
    const targetTime = setMinutes(setHours(new Date(day), slot.hour), slot.minute);

    if (resizingEvent.direction === 'bottom') {
      // Resizing end time
      const startTime = new Date(resizingEvent.event.start_time);
      if (targetTime > startTime) {
        setDragOver({ employeeId, day, slotIndex });
      }
    } else {
      // Resizing start time
      const endTime = new Date(resizingEvent.event.end_time);
      if (targetTime < endTime) {
        setDragOver({ employeeId, day, slotIndex });
      }
    }
  };

  const handleResizeEnd = async (employeeId: string, day: Date, slotIndex: number) => {
    if (!resizingEvent) return;

    try {
      const slot = timeSlots[slotIndex];
      const targetTime = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
      
      if (resizingEvent.direction === 'bottom') {
        // Add 15 minutes to include the slot
        targetTime.setMinutes(targetTime.getMinutes() + 15);
        
        const { error } = await supabase
          .from('calendar_events')
          .update({ end_time: targetTime.toISOString() })
          .eq('id', resizingEvent.event.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .update({ start_time: targetTime.toISOString() })
          .eq('id', resizingEvent.event.id);

        if (error) throw error;
      }

      toast.success('Event resized successfully');
      fetchEvents();
    } catch (error: any) {
      console.error('Error resizing event:', error);
      toast.error('Failed to resize event');
    } finally {
      setResizingEvent(null);
      setDragOver(null);
    }
  };

  const getEventsForDaySlot = (day: Date, slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    const slotStart = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      const isForSelectedEmployee = selectedEmployees.some(empId => 
        event.is_public || event.target_users?.includes(empId)
      );
      
      return isForSelectedEmployee && (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );
    });
  };

  const getEventsForEmployeeDaySlot = (employeeId: string, day: Date, slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    const slotStart = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 15);

    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // Event must be for this specific employee (or public and visible to all)
      const isForThisEmployee = event.target_users?.includes(employeeId) || event.is_public;
      
      return isForThisEmployee && (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );
    });
  };

  const getEventOwnerEmployee = (event: CalendarEvent) => {
    if (event.target_users && event.target_users.length > 0) {
      return selectedEmployeeData.find(e => event.target_users.includes(e.id));
    }
    return null;
  };

  const getEventParticipants = (event: CalendarEvent) => {
    return event.target_users
      ?.map(id => employees.find(e => e.id === id))
      .filter(Boolean) || [];
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
      'bg-accent/30 border-border',
      'bg-accent/40 border-border',
      'bg-accent/20 border-border',
      'bg-muted/50 border-border',
      'bg-accent/50 border-border',
      'bg-muted/70 border-border',
      'bg-accent/60 border-border',
    ];
    return colors[index % colors.length];
  };

  const DEFAULT_COLORS = [
    '#FF6B9D', '#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
    '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#84CC16',
  ];

  const eventTypeColors: Record<string, string> = {
    appointment: '#3b82f6',
    project: '#8b5cf6',
    event: '#3b82f6',
    reminder: '#f59e0b',
    birthday: '#ec4899',
    holiday: '#dc2626',
    meeting: '#10b981',
  };

  const getEventTypeColor = (eventType: string) => {
    return eventTypeColors[eventType] || '#3b82f6';
  };

  // Compute selected employee data
  const selectedEmployeeData = employees.filter(e => selectedEmployees.includes(e.id));
  
  // Memoized color function to prevent infinite loops in ParticipantIndicators
  const getEmployeeEventColor = useCallback((employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    const color = employee?.calendar_color;
    
    if (color) {
      return color;
    }
    
    const index = selectedEmployeeData.findIndex(e => e.id === employeeId);
    const fallbackColor = DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    return fallbackColor;
  }, [employees, selectedEmployeeData]);

  // Helper to format date for datetime-local input without timezone conversion
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  const getTimeForSlot = (slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    return format(setMinutes(setHours(new Date(), slot.hour), slot.minute), 'h:mm a');
  };

  const getTimeRangeForHover = (startIndex: number, currentIndex: number) => {
    const startSlot = timeSlots[startIndex];
    const endSlot = timeSlots[currentIndex];
    
    const startTime = format(setMinutes(setHours(new Date(), startSlot.hour), startSlot.minute), 'h:mm a');
    // Add 15 minutes to show the end of the selected slot
    const endTime = format(setMinutes(setHours(new Date(), endSlot.hour), endSlot.minute + 15), 'h:mm a');
    
    return `${startTime} - ${endTime}`;
  };

  const getCurrentTimePosition = () => {
    const now = currentTime;
    const hour = getHours(now);
    const minute = getMinutes(now);
    
    // Calendar starts at 6am (hour 6) and each slot is 15 minutes
    if (hour < 6 || hour >= 22) return null;
    
    const minutesFromStart = (hour - 6) * 60 + minute;
    const slotHeight = 24; // Height of each slot in pixels
    const totalMinutes = 16 * 60; // 16 hours total (6am to 10pm)
    const position = (minutesFromStart / totalMinutes) * (timeSlots.length * slotHeight);
    
    return position;
  };

  const handleSlotHover = (employeeId: string, day: Date, slotIndex: number, startIndex?: number) => {
    if (startIndex === undefined) {
      setHoverSlot({ employeeId, day, slotIndex, startIndex: slotIndex });
    } else {
      setHoverSlot({ employeeId, day, slotIndex, startIndex });
    }
  };

  const handleSelectionStart = (employeeId: string, day: Date, slotIndex: number) => {
    setIsDraggingSelection(true);
    setDragSelection({ employeeId, day, startIndex: slotIndex, endIndex: slotIndex });
  };

  const handleSelectionMove = (employeeId: string, day: Date, slotIndex: number) => {
    if (isDraggingSelection && dragSelection && dragSelection.employeeId === employeeId && isSameDay(dragSelection.day, day)) {
      // Only update if the endIndex actually changed to prevent infinite loops
      if (dragSelection.endIndex !== slotIndex) {
        setDragSelection(prev => prev ? { ...prev, endIndex: slotIndex } : null);
      }
    }
  };

  const handleSelectionEnd = () => {
    if (isDraggingSelection && dragSelection) {
      console.log('🟢 Drag Selection End - Opening Create Dialog');
      const startSlotIndex = Math.min(dragSelection.startIndex, dragSelection.endIndex);
      const endSlotIndex = Math.max(dragSelection.startIndex, dragSelection.endIndex);
      
      const startSlot = timeSlots[startSlotIndex];
      const endSlot = timeSlots[endSlotIndex];
      
      const startTime = setMinutes(setHours(new Date(dragSelection.day), startSlot.hour), startSlot.minute);
      const endTime = setMinutes(setHours(new Date(dragSelection.day), endSlot.hour), endSlot.minute);
      endTime.setMinutes(endTime.getMinutes() + 15); // Add 15 minutes to include the end slot
      
      setPrefilledData({
        employeeId: dragSelection.employeeId,
        startTime: formatDateTimeLocal(startTime),
        endTime: formatDateTimeLocal(endTime),
      });
      
      setCreateDialogOpen(true);
    }
    
    setIsDraggingSelection(false);
    setDragSelection(null);
  };

  if (loading && selectedEmployees.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dateRangeText = viewMode === 'day'
    ? format(currentDate, 'MMMM d, yyyy')
    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Team Calendar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
            console.log('🟢 Plus Button Click - Opening Create Dialog (no prefill)');
            setPrefilledData(null);
            setCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      {selectedEmployees.length > 3 && viewMode === 'week' && (
        <Card className="bg-warning/10 border-warning shrink-0">
          <CardContent className="p-2">
            <p className="text-xs text-warning-foreground">
              ⚠️ Week view limited to 3 employees. Select fewer or switch to Day view.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="shrink-0 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "min-w-[200px] justify-start text-left font-semibold",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRangeText}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) setCurrentDate(date);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleNavigate('today')}>
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-3 min-h-0 overflow-hidden">
          {/* Legends - Collapsible */}
          {selectedEmployeeData.length > 0 && (
            <details className="mb-2 shrink-0" open>
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground mb-2">
                Legends (click to hide)
              </summary>
              <div className="space-y-2">
              {/* Employee Color Legend */}
              <div className="p-2 bg-muted/30 rounded border">
                <h3 className="text-xs font-semibold mb-1.5 text-muted-foreground">Employees</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {selectedEmployeeData.map((employee) => {
                    const employeeColor = getEmployeeEventColor(employee.id);
                    return (
                    <div key={employee.id} className="flex items-center gap-1.5">
                      <div 
                        className="w-3 h-3 rounded border border-white shadow-sm"
                        style={{ backgroundColor: employeeColor }}
                      />
                      <span className="text-xs">{employee.full_name}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Event Type Legend */}
              <div className="p-2 bg-muted/30 rounded border">
                <h3 className="text-xs font-semibold mb-1.5 text-muted-foreground">Event Types</h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(eventTypeColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div 
                        className="w-3 h-3 rounded border border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </details>
          )}

          {selectedEmployeeData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select employees to view their calendars
            </div>
          ) : (
            <div 
              className="border rounded overflow-hidden flex-1 flex flex-col min-h-0"
              onMouseLeave={() => {
                if (isDraggingSelection) {
                  handleSelectionEnd();
                }
              }}
            >
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Header with Days and Employees */}
                <div className="sticky top-0 z-20 bg-background border-b shrink-0">
                  <div className="grid" style={{ 
                    gridTemplateColumns: `100px repeat(${displayDays.length}, minmax(${selectedEmployeeData.length * 140}px, 1fr))` 
                  }}>
                    <div className="p-2 text-xs font-medium text-muted-foreground border-r bg-muted/50">
                      Time
                    </div>
                    {displayDays.map(day => (
                      <div
                        key={day.toISOString()}
                        className={`border-r last:border-r-0 ${isToday(day) ? 'bg-primary/5' : 'bg-muted/50'}`}
                      >
                        <div className="p-3 text-center border-b">
                          <div className="text-xs font-medium text-muted-foreground">
                            {format(day, 'EEE')}
                          </div>
                          <div className={`text-2xl font-semibold ${isToday(day) ? 'text-primary' : ''}`}>
                            {format(day, 'd')}
                          </div>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: `repeat(${selectedEmployeeData.length}, 1fr)` }}>
                          {selectedEmployeeData.map((employee) => (
                            <div
                              key={employee.id}
                              className="p-2 text-center text-sm font-medium border-r last:border-r-0 truncate bg-muted/40"
                              title={employee.full_name}
                              style={{ color: getEmployeeEventColor(employee.id) }}
                            >
                              {employee.full_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time Grid */}
                <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef}>
                  {/* Current Time Indicator */}
                  {getCurrentTimePosition() !== null && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{ top: `${getCurrentTimePosition()}px` }}
                    >
                      <div className="relative">
                        <div className="absolute left-0 w-full h-0.5 bg-destructive shadow-lg">
                          <div className="absolute -left-2 -top-1.5 w-4 h-4 bg-destructive rounded-full shadow-lg" />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {timeSlots.map((slot, slotIndex) => (
                    <div
                      key={slotIndex}
                      className="grid"
                      style={{ 
                        gridTemplateColumns: `100px repeat(${displayDays.length}, minmax(${selectedEmployeeData.length * 140}px, 1fr))`,
                        minHeight: '24px'
                      }}
                    >
                      <div className="p-2 text-xs text-muted-foreground border-r border-b sticky left-0 bg-background z-10 flex items-center">
                        {slot.label}
                      </div>
                      {displayDays.map(day => (
                        <div key={`${day.toISOString()}-${slotIndex}`} className="border-r border-b last:border-r-0 relative">
                          <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${selectedEmployeeData.length}, 1fr)` }}>
                            {selectedEmployeeData.map((employee, empIdx) => {
                              const isDragOverSlot = dragOver?.employeeId === employee.id && 
                                                      isSameDay(dragOver.day, day) && 
                                                      dragOver.slotIndex === slotIndex;
                              const isHoverSlot = hoverSlot?.employeeId === employee.id &&
                                                  isSameDay(hoverSlot.day, day) &&
                                                  hoverSlot.slotIndex === slotIndex;
                              
                              const isInHoverRange = hoverSlot?.employeeId === employee.id &&
                                                     isSameDay(hoverSlot.day, day) &&
                                                     slotIndex >= Math.min(hoverSlot.startIndex, hoverSlot.slotIndex) &&
                                                     slotIndex <= Math.max(hoverSlot.startIndex, hoverSlot.slotIndex);

                              const isInDragSelection = dragSelection?.employeeId === employee.id &&
                                                        isSameDay(dragSelection.day, day) &&
                                                        slotIndex >= Math.min(dragSelection.startIndex, dragSelection.endIndex) &&
                                                        slotIndex <= Math.max(dragSelection.startIndex, dragSelection.endIndex);

                              return (
                                <div
                                  key={`${employee.id}-${slotIndex}`}
                                  className={`h-6 bg-background hover:bg-accent/70 cursor-pointer transition-colors border-r last:border-r-0 relative ${
                                    isDragOverSlot ? 'ring-2 ring-primary ring-inset' : ''
                                  } ${isInHoverRange ? 'bg-accent/50' : ''} ${isInDragSelection ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''}`}
                                  onClick={() => !isDraggingSelection && handleSlotClick(employee.id, day, slotIndex)}
                                  onDragOver={(e) => handleDragOver(e, employee.id, day, slotIndex)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, employee.id, day, slotIndex)}
                                  onMouseDown={(e) => {
                                    if (e.button === 0 && !resizingEvent) {
                                      e.preventDefault();
                                      handleSelectionStart(employee.id, day, slotIndex);
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    if (isDraggingSelection) {
                                      handleSelectionMove(employee.id, day, slotIndex);
                                    }
                                  }}
                                  onMouseMove={(e) => {
                                    if (resizingEvent) {
                                      handleResizeMove(e, employee.id, day, slotIndex);
                                    }
                                  }}
                                  onMouseUp={() => {
                                    if (resizingEvent) {
                                      handleResizeEnd(employee.id, day, slotIndex);
                                    } else if (isDraggingSelection) {
                                      handleSelectionEnd();
                                    }
                                  }}
                                >
                                  {isInDragSelection && dragSelection && slotIndex === Math.min(dragSelection.startIndex, dragSelection.endIndex) && (
                                    <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
                                      <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs font-semibold shadow-lg whitespace-nowrap">
                                        {getTimeRangeForHover(Math.min(dragSelection.startIndex, dragSelection.endIndex), Math.max(dragSelection.startIndex, dragSelection.endIndex))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Events for this specific employee */}
                                  {(() => {
                                    const employeeEvents = getEventsForEmployeeDaySlot(employee.id, day, slotIndex);
                                    const isFirstSlotForEvent = (event: CalendarEvent) => {
                                      const eventStart = new Date(event.start_time);
                                      const slotStart = setMinutes(setHours(new Date(day), slot.hour), slot.minute);
                                      return Math.abs(eventStart.getTime() - slotStart.getTime()) < 15 * 60 * 1000;
                                    };

                                    return employeeEvents.filter(isFirstSlotForEvent).map(event => {
                                      const height = calculateEventHeight(event);
                                      const employeeColor = getEmployeeEventColor(employee.id);
                                      const eventTypeColor = getEventTypeColor(event.event_type);
                                      
                                      return (
                                        <EventContextMenu
                                          key={event.id}
                                          event={event}
                                          employees={employees}
                                          currentDate={currentDate}
                                          onEventCopied={fetchEvents}
                                        >
                                          <div
                                            draggable={!resizingEvent}
                                            onDragStart={(e) => {
                                              if (resizingEvent) {
                                                e.preventDefault();
                                                return;
                                              }
                                              handleDragStart(e, event);
                                            }}
                                            onClick={(e) => {
                                              if (resizingEvent) return;
                                              e.stopPropagation();
                                              setSelectedEvent(event);
                                              setDetailsDialogOpen(true);
                                            }}
                                            className={`absolute inset-x-0.5 text-xs p-1.5 rounded-md text-white hover:opacity-90 transition-opacity z-10 ${resizingEvent?.event.id === event.id ? 'cursor-ns-resize' : 'cursor-move'} border-2 ${resizingEvent?.event.id === event.id ? 'border-white/60' : 'border-transparent hover:border-white/30'} group shadow-md overflow-hidden`}
                                            style={{
                                              backgroundColor: eventTypeColor,
                                              height: `${height * 24}px`,
                                            }}
                                            title={`${event.title} - Right-click to copy, drag to move`}
                                          >
                                            {/* Employee Color Indicator */}
                                            <div 
                                              className="absolute top-0 left-0 right-0 h-0.5"
                                              style={{ backgroundColor: employeeColor }}
                                            />
                                            
                                            {/* Resize Handle Top */}
                                            <div
                                              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/30 bg-white/10 transition-all z-30 flex items-center justify-center"
                                              draggable={false}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleResizeStart(e, event, 'top');
                                              }}
                                              onDragStart={(e) => e.preventDefault()}
                                              onClick={(e) => e.stopPropagation()}
                                              title="Drag to resize"
                                            >
                                              <div className="w-6 h-0.5 bg-white/50 rounded-full pointer-events-none" />
                                            </div>
                                            
                                            <div className="font-semibold truncate text-[11px] mt-0.5">{event.title}</div>
                                            {height > 2 && (
                                              <div className="text-[10px] opacity-80 mt-0.5">
                                                {format(new Date(event.start_time), 'h:mm a')}
                                              </div>
                                            )}
                                            
                                            {/* Resize Handle Bottom */}
                                            <div
                                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white/30 bg-white/10 transition-all z-30 flex items-center justify-center"
                                              draggable={false}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleResizeStart(e, event, 'bottom');
                                              }}
                                              onDragStart={(e) => e.preventDefault()}
                                              onClick={(e) => e.stopPropagation()}
                                              title="Drag to resize"
                                            >
                                              <div className="w-6 h-0.5 bg-white/50 rounded-full pointer-events-none" />
                                            </div>
                                          </div>
                                        </EventContextMenu>
                                      );
                                    });
                                  })()}
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

          {/* Tips */}
          {selectedEmployeeData.length > 0 && (
            <div className="mt-1.5 shrink-0">
              <p className="text-[10px] text-muted-foreground">
                💡 Drag to select • Right-click to copy • Drag events to move • Drag edges to resize
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {createDialogOpen && (
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
      )}

      {detailsDialogOpen && selectedEvent && (
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
      )}

      {pendingMove && (
        <MoveConfirmDialog
          open={moveConfirmOpen}
          onOpenChange={setMoveConfirmOpen}
          participants={getEventParticipants(pendingMove.event)}
          targetEmployee={employees.find(e => e.id === pendingMove.employeeId)!}
          onUpdateAll={() => {
            executeMoveEvent(pendingMove.event, pendingMove.employeeId, pendingMove.day, pendingMove.slotIndex, false);
            setMoveConfirmOpen(false);
            setPendingMove(null);
          }}
          onCreateSeparate={() => {
            executeMoveEvent(pendingMove.event, pendingMove.employeeId, pendingMove.day, pendingMove.slotIndex, true);
            setMoveConfirmOpen(false);
            setPendingMove(null);
          }}
        />
      )}
    </div>
  );
}