import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Calendar, Gift, Cake, PartyPopper } from "lucide-react";
import { format, isWithinInterval, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  image_url: string | null;
  is_pinned: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
}

export function UpcomingReminders() {
  const [upcomingItems, setUpcomingItems] = useState<Array<{
    id: string;
    title: string;
    type: 'announcement' | 'event';
    date: string;
    icon: 'bell' | 'calendar' | 'birthday' | 'party' | 'gift';
  }>>([]);

  useEffect(() => {
    fetchUpcomingItems();
  }, []);

  const fetchUpcomingItems = async () => {
    const now = new Date();
    const nextWeek = addDays(now, 7);

    console.log('📅 Fetching upcoming reminders:', {
      now: now.toISOString(),
      nextWeek: nextWeek.toISOString(),
    });

    try {
      // Fetch active announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, title, content, created_at, expires_at, image_url, is_pinned')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${now.toISOString()}`)
        .limit(3);

      console.log('📢 Announcements query result:', {
        count: announcements?.length || 0,
        data: announcements,
        error: announcementsError,
      });

      // Fetch upcoming calendar events
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('id, title, event_type, start_time, end_time')
        .gte('start_time', now.toISOString())
        .lte('start_time', nextWeek.toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      console.log('📆 Events query result:', {
        count: events?.length || 0,
        data: events,
        error: eventsError,
      });

      const items: Array<{
        id: string;
        title: string;
        type: 'announcement' | 'event';
        date: string;
        icon: 'bell' | 'calendar' | 'birthday' | 'party' | 'gift';
      }> = [];

      // Add announcements
      announcements?.forEach(ann => {
        const isPinned = ann.is_pinned;
        const isBirthday = ann.title.toLowerCase().includes('birthday');
        const isParty = ann.title.toLowerCase().includes('party') || ann.title.toLowerCase().includes('celebration');
        
        items.push({
          id: ann.id,
          title: ann.title,
          type: 'announcement',
          date: ann.expires_at || ann.created_at,
          icon: isBirthday ? 'birthday' : isParty ? 'party' : 'bell',
        });
      });

      // Add events
      events?.forEach(event => {
        const isChristmas = event.title.toLowerCase().includes('christmas');
        const isBirthday = event.event_type === 'birthday' || event.title.toLowerCase().includes('birthday');
        
        items.push({
          id: event.id,
          title: event.title,
          type: 'event',
          date: event.start_time,
          icon: isChristmas ? 'gift' : isBirthday ? 'birthday' : 'calendar',
        });
      });

      // Sort by date and take top 5
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const finalItems = items.slice(0, 5);
      
      console.log('✅ Final upcoming items:', {
        count: finalItems.length,
        items: finalItems,
      });
      
      setUpcomingItems(finalItems);
    } catch (error) {
      console.error('❌ Error fetching upcoming items:', error);
    }
  };

  if (upcomingItems.length === 0) return null;

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'birthday':
        return <Cake className="h-4 w-4" />;
      case 'party':
        return <PartyPopper className="h-4 w-4" />;
      case 'gift':
        return <Gift className="h-4 w-4" />;
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              Upcoming Reminders & Events
            </h3>
            <div className="space-y-2">
              {upcomingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 text-sm p-2 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 text-primary">
                    {getIcon(item.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0 text-xs">
                    {item.type}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
