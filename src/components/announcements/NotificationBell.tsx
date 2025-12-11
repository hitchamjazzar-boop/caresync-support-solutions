import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Bell, Megaphone, MessageSquare } from 'lucide-react';
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

interface NotificationItem {
  id: string;
  type: 'announcement' | 'shoutout_request' | 'feedback_request';
  title: string;
  content: string;
  created_at: string;
  is_pinned?: boolean;
  is_read: boolean;
}

export function NotificationBell() {
  const { user } = useAuth();
  const { canSeeAnnouncement } = useAnnouncementVisibility();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Set up realtime subscriptions
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_acknowledgments',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shoutout_requests',
          filter: `recipient_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_requests',
          filter: `recipient_id=eq.${user.id}`
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Refetch when popover opens
  useEffect(() => {
    if (open && user) {
      fetchNotifications();
    }
  }, [open, user]);

  const fetchNotifications = async () => {
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

      // Get acknowledged notifications (for shoutout/feedback requests)
      const { data: acknowledgedNotifications } = await supabase
        .from('notification_acknowledgments')
        .select('notification_id, notification_type')
        .eq('user_id', user.id);

      const acknowledgedShoutoutIds = new Set(
        (acknowledgedNotifications || [])
          .filter(n => n.notification_type === 'shoutout_request')
          .map(n => n.notification_id)
      );
      const acknowledgedFeedbackIds = new Set(
        (acknowledgedNotifications || [])
          .filter(n => n.notification_type === 'feedback_request')
          .map(n => n.notification_id)
      );

      // Fetch announcements
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('id, title, content, created_at, is_pinned, target_type, target_users, target_roles, target_departments, expires_at')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      // Filter announcements: not expired and user can see
      const now = new Date();
      const activeAnnouncements = (announcementData || []).filter(
        (announcement: any) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && canSee;
        }
      );

      const announcementNotifications: NotificationItem[] = activeAnnouncements.map((a: any) => ({
        id: a.id,
        type: 'announcement' as const,
        title: a.title,
        content: a.content,
        created_at: a.created_at,
        is_pinned: a.is_pinned,
        is_read: readIds.includes(a.id) || dismissedIds.includes(a.id) || acknowledgedIds.includes(a.id),
      }));

      // Fetch pending shoutout requests
      const { data: shoutoutData } = await supabase
        .from('shoutout_requests')
        .select('id, message, created_at')
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const shoutoutNotifications: NotificationItem[] = (shoutoutData || []).map((s: any) => ({
        id: s.id,
        type: 'shoutout_request' as const,
        title: 'Shout Out Request',
        content: s.message || 'You have been asked to give a shout out to a colleague.',
        created_at: s.created_at,
        is_read: acknowledgedShoutoutIds.has(s.id),
      }));

      // Fetch pending feedback requests
      const { data: feedbackData } = await supabase
        .from('feedback_requests')
        .select('id, message, created_at')
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      const feedbackNotifications: NotificationItem[] = (feedbackData || []).map((f: any) => ({
        id: f.id,
        type: 'feedback_request' as const,
        title: 'Feedback Request',
        content: f.message || 'You have been asked to provide feedback.',
        created_at: f.created_at,
        is_read: acknowledgedFeedbackIds.has(f.id),
      }));

      // Combine and sort all notifications
      const allNotifications = [
        ...shoutoutNotifications,
        ...feedbackNotifications,
        ...announcementNotifications,
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);

      // Calculate unread count
      const unread = allNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  const markAnnouncementAsRead = async (announcementId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('announcement_reads')
        .insert({
          user_id: user.id,
          announcement_id: announcementId,
          read_at: new Date().toISOString(),
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error marking announcement as read:', error);
        return;
      }

      setReadAnnouncementIds((prev) =>
        prev.includes(announcementId) ? prev : [...prev, announcementId]
      );
      
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string, notificationType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notification_acknowledgments')
        .insert({
          user_id: user.id,
          notification_id: notificationId,
          notification_type: notificationType,
          acknowledged_at: new Date().toISOString(),
        });

      if (error && !error.message.includes('duplicate')) {
        console.error('Error marking notification as read:', error);
        return;
      }
      
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    setOpen(false);
    
    if (notification.type === 'announcement') {
      await markAnnouncementAsRead(notification.id);
      navigate(`/announcement-gallery?highlight=${notification.id}`);
    } else if (notification.type === 'shoutout_request') {
      await markNotificationAsRead(notification.id, 'shoutout_request');
      navigate('/shoutouts');
    } else if (notification.type === 'feedback_request') {
      await markNotificationAsRead(notification.id, 'feedback_request');
      navigate('/feedback');
    }
  };

  const getNotificationIcon = (notification: NotificationItem) => {
    if (notification.type === 'shoutout_request') {
      return (
        <div className="p-1.5 rounded-full bg-amber-500/20 shrink-0">
          <Megaphone className="h-4 w-4 text-amber-500" />
        </div>
      );
    }
    if (notification.type === 'feedback_request') {
      return (
        <div className="p-1.5 rounded-full bg-blue-500/20 shrink-0">
          <MessageSquare className="h-4 w-4 text-blue-500" />
        </div>
      );
    }
    if (notification.is_pinned) {
      return <span className="text-lg" title="Pinned">📌</span>;
    }
    return null;
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
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={`${notification.type}-${notification.id}`}
                  className={`p-4 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-accent/40 hover:bg-accent' : 'hover:bg-accent'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2">
                    {getNotificationIcon(notification)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className={`text-sm truncate ${
                            !notification.is_read ? 'font-semibold' : 'font-medium text-muted-foreground'
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 h-5 leading-none"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
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
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
