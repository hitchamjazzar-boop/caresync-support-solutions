import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  expires_at: string | null;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed));
    }

    fetchAnnouncements();

    // Set up realtime subscription
    const channel = supabase
      .channel('announcements-banner')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired announcements
      const now = new Date();
      const activeAnnouncements = (data || []).filter(
        (announcement) =>
          !announcement.expires_at || new Date(announcement.expires_at) > now
      );

      setAnnouncements(activeAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissedIds = [...dismissedIds, id];
    setDismissedIds(newDismissedIds);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissedIds));
  };

  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedIds.includes(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const getExpirationText = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    
    const expiresDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 24) {
      return `Expires ${formatDistanceToNow(expiresDate, { addSuffix: true })}`;
    }
    return null;
  };

  return (
    <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
      {visibleAnnouncements.map((announcement) => (
        <Alert 
          key={announcement.id} 
          className="relative border-2 shadow-lg animate-fade-in bg-gradient-to-r from-primary/10 via-primary/5 to-background dark:from-primary/20 dark:via-primary/10 dark:to-background"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center animate-pulse">
                <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0 pr-8">
              <AlertTitle className="text-base sm:text-lg font-bold mb-2 text-foreground">
                📢 {announcement.title}
              </AlertTitle>
              <AlertDescription className="text-sm sm:text-base whitespace-pre-wrap text-foreground/90">
                {announcement.content}
                {getExpirationText(announcement.expires_at) && (
                  <span className="block mt-3 text-xs sm:text-sm font-semibold text-primary">
                    ⏰ {getExpirationText(announcement.expires_at)}
                  </span>
                )}
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 sm:h-8 sm:w-8 hover:bg-primary/10"
            onClick={() => handleDismiss(announcement.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
