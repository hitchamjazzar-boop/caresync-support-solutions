import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAnnouncementVisibility } from '@/hooks/useAnnouncementVisibility';

interface Announcement {
  id: string;
  title: string;
  content: string;
  expires_at: string | null;
  is_pinned: boolean;
  target_type: string;
  target_users: string[] | null;
  target_roles: string[] | null;
  target_departments: string[] | null;
}

export function AnnouncementBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canSeeAnnouncement } = useAnnouncementVisibility();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load dismissed announcements from localStorage
    const dismissed = localStorage.getItem('dismissedAnnouncements');
    if (dismissed) {
      setDismissedIds(JSON.parse(dismissed));
    }

    fetchAnnouncements();
    fetchAcknowledgments();

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
  }, [user]);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, expires_at, is_pinned, target_type, target_users, target_roles, target_departments')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired announcements and announcements user can't see
      const now = new Date();
      const activeAnnouncements = (data || []).filter(
        (announcement) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && canSee;
        }
      );

      setAnnouncements(activeAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchAcknowledgments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('announcement_acknowledgments')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (error) throw error;

      setAcknowledgedIds((data || []).map(a => a.announcement_id));
    } catch (error) {
      console.error('Error fetching acknowledgments:', error);
    }
  };

  const handleAcknowledge = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('announcement_acknowledgments')
        .insert({
          user_id: user.id,
          announcement_id: id,
        });

      if (error) throw error;

      setAcknowledgedIds([...acknowledgedIds, id]);
      
      toast({
        title: 'Acknowledged',
        description: 'Thank you for acknowledging this announcement.',
      });
    } catch (error: any) {
      console.error('Error acknowledging announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge announcement',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = (id: string) => {
    const newDismissedIds = [...dismissedIds, id];
    setDismissedIds(newDismissedIds);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(newDismissedIds));
  };

  const visibleAnnouncements = announcements.filter(
    (announcement) => !acknowledgedIds.includes(announcement.id)
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
          className={`relative border-2 shadow-lg animate-fade-in ${
            announcement.is_pinned 
              ? 'bg-gradient-to-r from-amber-50 via-amber-25 to-background dark:from-amber-950 dark:via-amber-900/50 dark:to-background border-amber-300 dark:border-amber-700'
              : 'bg-gradient-to-r from-primary/10 via-primary/5 to-background dark:from-primary/20 dark:via-primary/10 dark:to-background'
          }`}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center ${
                announcement.is_pinned
                  ? 'bg-amber-200 dark:bg-amber-800 animate-pulse'
                  : 'bg-primary/20 dark:bg-primary/30 animate-pulse'
              }`}>
                <Megaphone className={`h-5 w-5 sm:h-6 sm:w-6 ${
                  announcement.is_pinned ? 'text-amber-700 dark:text-amber-300' : 'text-primary'
                }`} />
              </div>
            </div>
            <div className="flex-1 min-w-0 pr-8 sm:pr-20">
              <AlertTitle className="text-base sm:text-lg font-bold mb-2 text-foreground flex items-center gap-2">
                {announcement.is_pinned && <span className="text-xl">📌</span>}
                📢 {announcement.title}
                {announcement.is_pinned && (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">
                    IMPORTANT
                  </span>
                )}
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
            variant="default"
            size="sm"
            className={`absolute right-2 top-2 gap-1 ${
              announcement.is_pinned
                ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800'
                : ''
            }`}
            onClick={() => handleAcknowledge(announcement.id)}
          >
            <Check className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Acknowledge</span>
          </Button>
        </Alert>
      ))}
    </div>
  );
}
