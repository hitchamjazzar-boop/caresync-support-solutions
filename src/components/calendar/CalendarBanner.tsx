import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Cake, Calendar, PartyPopper } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';

interface BannerItem {
  id: string;
  title: string;
  type: 'birthday' | 'company_event';
  date: Date;
}

export function CalendarBanner() {
  const [items, setItems] = useState<BannerItem[]>([]);

  useEffect(() => {
    fetchUpcomingItems();
  }, []);

  const fetchUpcomingItems = async () => {
    const now = new Date();
    const nextWeek = addDays(now, 7);

    try {
      // Fetch company events from announcements
      const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, created_at')
        .eq('is_active', true)
        .gte('created_at', now.toISOString())
        .lte('created_at', nextWeek.toISOString())
        .limit(5);

      const companyEvents: BannerItem[] = (announcements || []).map(ann => ({
        id: ann.id,
        title: ann.title,
        type: 'company_event',
        date: new Date(ann.created_at),
      }));

      setItems(companyEvents);
    } catch (error) {
      console.error('Error fetching calendar banner items:', error);
    }
  };

  if (items.length === 0) return null;

  const getDateText = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {items[0].type === 'birthday' ? (
            <Cake className="h-5 w-5 text-primary" />
          ) : (
            <PartyPopper className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Events
          </div>
          <div className="space-y-1.5">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {getDateText(item.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  {item.type === 'birthday' ? (
                    <Cake className="h-3.5 w-3.5 text-pink-500" />
                  ) : (
                    <PartyPopper className="h-3.5 w-3.5 text-orange-500" />
                  )}
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
