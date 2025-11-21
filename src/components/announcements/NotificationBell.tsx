import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();
    fetchRecentAnnouncements();

    // Set up realtime subscription
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

      // Get active announcements
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('id, expires_at')
        .eq('is_active', true);

      if (error) throw error;

      // Filter out expired, dismissed, and acknowledged announcements
      const now = new Date();
      const unreadAnnouncements = (announcements || []).filter(
        (announcement) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const isNotDismissed = !dismissedIds.includes(announcement.id);
          const isNotAcknowledged = !acknowledgedIds.includes(announcement.id);
          return isNotExpired && isNotDismissed && isNotAcknowledged;
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
        .select('id, title, content, created_at, is_pinned')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      // Filter out expired announcements
      const now = new Date();
      const activeAnnouncements = (data || []).filter(
        (announcement: any) =>
          !announcement.expires_at || new Date(announcement.expires_at) > now
      );

      setRecentAnnouncements(activeAnnouncements);
    } catch (error) {
      console.error('Error fetching recent announcements:', error);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/');
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
        <ScrollArea className="h-[300px] sm:h-[400px]">
          {recentAnnouncements.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No announcements
            </div>
          ) : (
            <div className="divide-y">
              {recentAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={handleViewAll}
                >
                  <div className="flex items-start gap-2">
                    {announcement.is_pinned && (
                      <span className="text-lg" title="Pinned">
                        📌
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {announcement.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
