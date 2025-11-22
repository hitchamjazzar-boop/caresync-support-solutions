import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCheck, Mail, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementVisibility } from '@/hooks/useAnnouncementVisibility';
import { triggerBirthdayConfetti, triggerAchievementConfetti } from '@/lib/confetti';
import { playBirthdaySound, playCelebrationSound } from '@/lib/sounds';

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
  expires_at: string | null;
}

interface Memo {
  id: string;
  title: string;
  content: string;
  created_at: string;
  type: 'memo' | 'reminder' | 'warning';
  is_read: boolean;
  sender_id: string;
}

interface Notification {
  id: string;
  type: 'announcement' | 'memo';
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
  data: Announcement | Memo;
}

export default function Notifications() {
  const { user } = useAuth();
  const { canSeeAnnouncement } = useAnnouncementVisibility();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      // Fetch announcements
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (announcementError) throw announcementError;

      // Get read status for announcements
      const { data: readAnnouncements } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readAnnouncementIds = new Set(readAnnouncements?.map(r => r.announcement_id) || []);

      // Filter announcements user can see and not expired
      const now = new Date();
      const visibleAnnouncements = (announcementData || [])
        .filter((announcement: any) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && canSee;
        })
        .map((announcement: any) => ({
          id: announcement.id,
          type: 'announcement' as const,
          title: announcement.title,
          content: announcement.content,
          created_at: announcement.created_at,
          is_read: readAnnouncementIds.has(announcement.id),
          data: announcement,
        }));

      // Fetch memos
      const { data: memoData, error: memoError } = await supabase
        .from('memos')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (memoError) throw memoError;

      const memos = (memoData || []).map((memo: any) => ({
        id: memo.id,
        type: 'memo' as const,
        title: memo.title,
        content: memo.content,
        created_at: memo.created_at,
        is_read: memo.is_read,
        data: memo,
      }));

      // Combine and sort by date
      const allNotifications = [...visibleAnnouncements, ...memos].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notification: Notification) => {
    if (!user) return;

    try {
      if (notification.type === 'announcement') {
        const { error } = await supabase
          .from('announcement_reads')
          .insert({
            user_id: user.id,
            announcement_id: notification.id,
            read_at: new Date().toISOString(),
          });

        if (error && !error.message.includes('duplicate')) {
          console.error('Error marking as read:', error);
          return;
        }
      } else if (notification.type === 'memo') {
        const { error } = await supabase
          .from('memos')
          .update({ is_read: true })
          .eq('id', notification.id);

        if (error) {
          console.error('Error marking memo as read:', error);
          return;
        }
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;

    setMarkingAllRead(true);
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);

      if (unreadNotifications.length === 0) {
        setMarkingAllRead(false);
        return;
      }

      // Mark announcements as read
      const unreadAnnouncements = unreadNotifications.filter(n => n.type === 'announcement');
      if (unreadAnnouncements.length > 0) {
        const readRecords = unreadAnnouncements.map(notification => ({
          user_id: user.id,
          announcement_id: notification.id,
          read_at: new Date().toISOString(),
        }));

        const { error: announcementError } = await supabase
          .from('announcement_reads')
          .insert(readRecords);

        if (announcementError) throw announcementError;
      }

      // Mark memos as read
      const unreadMemos = unreadNotifications.filter(n => n.type === 'memo');
      if (unreadMemos.length > 0) {
        const memoIds = unreadMemos.map(n => n.id);

        const { error: memoError } = await supabase
          .from('memos')
          .update({ is_read: true })
          .in('id', memoIds);

        if (memoError) throw memoError;
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification);

    if (notification.type === 'announcement') {
      // Trigger effects based on announcement type
      const title = notification.title.toLowerCase();
      if (title.includes('promotion')) {
        triggerAchievementConfetti();
        playCelebrationSound();
      } else if (title.includes('employee of the month')) {
        triggerAchievementConfetti();
        playCelebrationSound();
      } else if (title.includes('birthday')) {
        triggerBirthdayConfetti();
        playBirthdaySound();
      }
    } else if (notification.type === 'memo') {
      navigate('/memos');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            View all your notifications and announcements
          </p>
        </div>
        {user && notifications.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAllRead || unreadCount === 0}
            className="gap-2"
          >
            {markingAllRead ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </>
            )}
          </Button>
        )}
      </div>

      {unreadCount > 0 && (
        <Card className="bg-accent/50 border-primary/20">
          <CardContent className="p-4">
            <p className="text-sm flex items-center gap-2">
              <Badge variant="default" className="animate-pulse">
                {unreadCount}
              </Badge>
              <span>unread notification{unreadCount !== 1 ? 's' : ''}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-sm text-muted-foreground">
              You're all caught up!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.is_read;
            const isMemo = notification.type === 'memo';
            const memoType = isMemo ? (notification.data as Memo).type : null;

            return (
              <Card
                key={`${notification.type}-${notification.id}`}
                className={`cursor-pointer transition-all ${
                  isUnread
                    ? 'bg-accent/40 border-primary/30 hover:bg-accent/60'
                    : 'hover:bg-accent/20'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {isMemo ? (
                        memoType === 'warning' ? (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )
                      ) : (
                        (notification.data as Announcement).is_pinned && (
                          <span className="text-lg" title="Pinned">
                            📌
                          </span>
                        )
                      )}
                      <CardTitle className="text-base flex items-center gap-2">
                        {notification.title}
                        {isUnread && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 h-5 leading-none animate-pulse"
                          >
                            New
                          </Badge>
                        )}
                      </CardTitle>
                      {isMemo && (
                        <Badge
                          variant={memoType === 'warning' ? 'destructive' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 h-5"
                        >
                          {memoType}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(notification.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{notification.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
