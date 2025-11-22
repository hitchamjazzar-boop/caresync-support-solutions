import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementVisibility } from '@/hooks/useAnnouncementVisibility';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  target_type: string;
  target_users: string[] | null;
  target_roles: string[] | null;
  target_departments: string[] | null;
  expires_at?: string | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { canSeeAnnouncement } = useAnnouncementVisibility();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();
    fetchRecentAnnouncements();

    // Set up realtime subscriptions for both announcements and reads
    const channel = supabase
      .channel('announcements-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchUnreadCount();
          fetchRecentAnnouncements();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUnreadCount();
          fetchRecentAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Refetch when popover opens
  useEffect(() => {
    if (open && user) {
      fetchUnreadCount();
      fetchRecentAnnouncements();
    }
  }, [open, user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      // Get dismissed announcements from localStorage
      const dismissed = localStorage.getItem('dismissedAnnouncements');
      const dismissedIds = dismissed ? JSON.parse(dismissed) : [];

      // Get acknowledged announcements
      const { data: acknowledged } = await supabase
        .from('announcement_acknowledgments')
        .select('announcement_id')
        .eq('user_id', user.id);

      const acknowledgedIds = acknowledged?.map(a => a.announcement_id) || [];

      // Get read announcements
      const { data: readAnnouncements } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = readAnnouncements?.map(a => a.announcement_id) || [];
      setReadAnnouncementIds(readIds);

      // Get active announcements
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('id, expires_at, target_type, target_users, target_roles, target_departments')
        .eq('is_active', true);

      if (error) throw error;

      // Filter announcements: not expired, not dismissed, not acknowledged, not read, and user can see
      const now = new Date();
      const unreadAnnouncements = (announcements || []).filter(
        (announcement) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const isNotDismissed = !dismissedIds.includes(announcement.id);
          const isNotAcknowledged = !acknowledgedIds.includes(announcement.id);
          const isNotRead = !readIds.includes(announcement.id);
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && isNotDismissed && isNotAcknowledged && isNotRead && canSee;
        }
      );

      setUnreadCount(unreadAnnouncements.length);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchRecentAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, created_at, is_pinned, target_type, target_users, target_roles, target_departments, expires_at')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter announcements: not expired and user can see
      const now = new Date();
      const activeAnnouncements = (data || []).filter(
        (announcement: any) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && canSee;
        }
      );

      setRecentAnnouncements(activeAnnouncements);
    } catch (error) {
      console.error('Error fetching recent announcements:', error);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/announcement-gallery');
  };

  const markAsRead = async (announcementId: string) => {
    if (!user) return;

    try {
      // Insert read status
      const { error } = await supabase
        .from('announcement_reads')
        .insert({
          user_id: user.id,
          announcement_id: announcementId,
          read_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error marking announcement as read:', error);
        return;
      }

      // Optimistically update local state
      setReadAnnouncementIds((prev) =>
        prev.includes(announcementId) ? prev : [...prev, announcementId]
      );
      
      // Refresh counts after marking as read
      await fetchUnreadCount();
      await fetchRecentAnnouncements();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleAnnouncementClick = async (announcementId: string) => {
    await markAsRead(announcementId);
    setOpen(false);
    navigate(`/announcement-gallery?highlight=${announcementId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[300px] sm:h-[500px] max-h-[60vh]">
          {recentAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No announcements
            </div>
          ) : (
            <div className="divide-y">
              {recentAnnouncements.map((announcement) => {
                const isUnread = !readAnnouncementIds.includes(announcement.id);

                return (
                  <div
                    key={announcement.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      isUnread ? 'bg-accent/40 hover:bg-accent' : 'hover:bg-accent'
                    }`}
                    onClick={() => handleAnnouncementClick(announcement.id)}
                  >
                    <div className="flex items-start gap-2">
                      {announcement.is_pinned && (
                        <span className="text-lg" title="Pinned">
                          📌
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-sm truncate ${
                              isUnread ? 'font-semibold' : 'font-medium text-muted-foreground'
                            }`}
                          >
                            {announcement.title}
                          </h4>
                          {isUnread && (
                            <Badge
                              variant="default"
                              className="text-[10px] px-1.5 py-0 h-5 leading-none"
                            >
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {announcement.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className="w-full text-xs sm:text-sm"
            onClick={handleViewAll}
          >
            View all announcements
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
