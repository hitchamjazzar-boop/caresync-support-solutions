import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Users, Calendar } from 'lucide-react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { toast } from 'sonner';

interface EventContextMenuProps {
  children: React.ReactNode;
  event: any;
  employees: any[];
  currentDate: Date;
  onEventCopied: () => void;
}

export function EventContextMenu({ children, event, employees, currentDate, onEventCopied }: EventContextMenuProps) {
  const [copying, setCopying] = useState(false);

  const copyEventToEmployee = async (targetEmployeeId: string) => {
    try {
      setCopying(true);
      
      const newTargetUsers = event.target_users?.includes(targetEmployeeId)
        ? event.target_users
        : [...(event.target_users || []), targetEmployeeId];

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          description: event.description,
          event_type: event.event_type,
          start_time: event.start_time,
          end_time: event.end_time,
          all_day: event.all_day,
          location: event.location,
          meeting_link: event.meeting_link,
          color: event.color,
          created_by: event.created_by,
          is_public: false,
          target_users: [targetEmployeeId],
          is_recurring: event.is_recurring,
          recurrence_pattern: event.recurrence_pattern,
          recurrence_end_date: event.recurrence_end_date,
        });

      if (error) throw error;

      toast.success('Event copied successfully');
      onEventCopied();
    } catch (error: any) {
      console.error('Error copying event:', error);
      toast.error('Failed to copy event');
    } finally {
      setCopying(false);
    }
  };

  const copyEventToDay = async (targetDay: Date) => {
    try {
      setCopying(true);
      
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);
      
      // Calculate time difference and apply to target day
      const newStart = new Date(targetDay);
      newStart.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
      
      const newEnd = new Date(targetDay);
      newEnd.setHours(eventEnd.getHours(), eventEnd.getMinutes(), 0, 0);

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          title: event.title,
          description: event.description,
          event_type: event.event_type,
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
          all_day: event.all_day,
          location: event.location,
          meeting_link: event.meeting_link,
          color: event.color,
          created_by: event.created_by,
          is_public: event.is_public,
          target_users: event.target_users,
          is_recurring: false, // Don't copy recurrence
          recurrence_pattern: null,
          recurrence_end_date: null,
        });

      if (error) throw error;

      toast.success('Event copied to ' + format(targetDay, 'MMM d'));
      onEventCopied();
    } catch (error: any) {
      console.error('Error copying event:', error);
      toast.error('Failed to copy event');
    } finally {
      setCopying(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Add next 7 days
  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(weekEnd, i + 1));
  const allDays = [...weekDays, ...nextDays];

  // Filter out employees already assigned to this event
  const availableEmployees = employees.filter(
    emp => !event.target_users?.includes(emp.id)
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Users className="h-4 w-4 mr-2" />
            Copy to Employee
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-64 overflow-y-auto">
            {availableEmployees.length === 0 ? (
              <ContextMenuItem disabled>All employees assigned</ContextMenuItem>
            ) : (
              availableEmployees.map(employee => (
                <ContextMenuItem
                  key={employee.id}
                  onClick={() => copyEventToEmployee(employee.id)}
                  disabled={copying}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {employee.full_name}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Calendar className="h-4 w-4 mr-2" />
            Copy to Day
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-64 overflow-y-auto">
            {allDays.map(day => (
              <ContextMenuItem
                key={day.toISOString()}
                onClick={() => copyEventToDay(day)}
                disabled={copying}
              >
                <Copy className="h-4 w-4 mr-2" />
                {format(day, 'EEE, MMM d')}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}