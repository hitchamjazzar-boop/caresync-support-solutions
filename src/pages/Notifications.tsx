import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCheck, Mail, AlertTriangle, Award, Cake, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementVisibility } from '@/hooks/useAnnouncementVisibility';
import { triggerBirthdayConfetti, triggerAchievementConfetti } from '@/lib/confetti';
import { playBirthdaySound, playCelebrationSound, playNotificationSound } from '@/lib/sounds';

interface AchievementType {
  name: string;
  description: string;
  color: string;
  category: string;
  icon: string;
}

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
  featured_user_id: string | null;
  achievement?: AchievementType;
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
  const previousNotificationCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Set up real-time subscriptions
      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'announcements',
          },
          () => {
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'memos',
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'announcement_reads',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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
      const visibleAnnouncementData = (announcementData || [])
        .filter((announcement: any) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && canSee;
        });

      // For promotion announcements, fetch the related achievement
      const promotionAnnouncements = visibleAnnouncementData.filter((a: any) => 
        a.title.toLowerCase().includes('promotion') && a.featured_user_id
      );

      let achievementsMap = new Map();
      if (promotionAnnouncements.length > 0) {
        const userIds = promotionAnnouncements.map((a: any) => a.featured_user_id);
        
        // Get the most recent promotion achievement for each user
        const { data: achievementData } = await supabase
          .from('employee_achievements')
          .select('user_id, achievement_type_id')
          .in('user_id', userIds)
          .order('awarded_date', { ascending: false });

        if (achievementData && achievementData.length > 0) {
          const typeIds = [...new Set(achievementData.map((a: any) => a.achievement_type_id))];
          
          const { data: typesData } = await supabase
            .from('achievement_types')
            .select('id, name, description, color, category, icon')
            .in('id', typeIds);

          if (typesData) {
            const typesMap = new Map(typesData.map((t: any) => [t.id, t]));
            
            // Map user to their latest achievement
            achievementData.forEach((ach: any) => {
              if (!achievementsMap.has(ach.user_id)) {
                const type = typesMap.get(ach.achievement_type_id);
                if (type) {
                  achievementsMap.set(ach.user_id, type);
                }
              }
            });
          }
        }
      }

      const visibleAnnouncements = visibleAnnouncementData.map((announcement: any) => {
        const achievement = announcement.featured_user_id 
          ? achievementsMap.get(announcement.featured_user_id)
          : undefined;

        return {
          id: announcement.id,
          type: 'announcement' as const,
          title: announcement.title,
          content: announcement.content,
          created_at: announcement.created_at,
          is_read: readAnnouncementIds.has(announcement.id),
          data: {
            ...announcement,
            achievement,
          },
        };
      });

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

      // Play notification sound for new notifications (not on initial load)
      if (!isInitialLoadRef.current) {
        const currentUnreadCount = allNotifications.filter(n => !n.is_read).length;
        if (currentUnreadCount > previousNotificationCountRef.current) {
          playNotificationSound();
        }
        previousNotificationCountRef.current = currentUnreadCount;
      } else {
        // After initial load, track the count
        previousNotificationCountRef.current = allNotifications.filter(n => !n.is_read).length;
        isInitialLoadRef.current = false;
      }
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
            
            // Check announcement types
            const announcement = !isMemo ? (notification.data as Announcement) : null;
            const isPromotion = announcement?.title.toLowerCase().includes('promotion');
            const isBirthday = announcement?.title.toLowerCase().includes('birthday');
            const isEmployeeOfMonth = announcement?.title.toLowerCase().includes('employee of the month');
            const achievement = announcement?.achievement;

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
                  <div className="flex items-start gap-3">
                    {/* Icon/Badge Display */}
                    {isMemo ? (
                      <div className="shrink-0">
                        {memoType === 'warning' ? (
                          <div className="p-2 rounded-lg bg-destructive/20">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-primary/20">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </div>
                    ) : achievement ? (
                      <div
                        className="p-3 rounded-lg shrink-0"
                        style={{ backgroundColor: `${achievement.color}20` }}
                      >
                        {isPromotion ? (
                          <TrendingUp
                            className="h-6 w-6"
                            style={{ color: achievement.color }}
                          />
                        ) : (
                          <Award
                            className="h-6 w-6"
                            style={{ color: achievement.color }}
                          />
                        )}
                      </div>
                    ) : isBirthday ? (
                      <div className="p-2 rounded-lg bg-pink-500/20 shrink-0">
                        <Cake className="h-5 w-5 text-pink-500" />
                      </div>
                    ) : isEmployeeOfMonth ? (
                      <div className="p-2 rounded-lg bg-yellow-500/20 shrink-0">
                        <Award className="h-5 w-5 text-yellow-500" />
                      </div>
                    ) : (
                      announcement?.is_pinned && (
                        <span className="text-lg" title="Pinned">
                          📌
                        </span>
                      )
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
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
                          {/* Achievement Details */}
                          {achievement && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="secondary"
                                className="text-xs"
                                style={{
                                  backgroundColor: `${achievement.color}20`,
                                  color: achievement.color,
                                  borderColor: `${achievement.color}40`,
                                }}
                              >
                                {achievement.name}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {achievement.category}
                              </Badge>
                            </div>
                          )}
                          {isMemo && (
                            <Badge
                              variant={memoType === 'warning' ? 'destructive' : 'secondary'}
                              className="text-[10px] px-1.5 py-0 h-5 mt-1"
                            >
                              {memoType}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(notification.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{notification.content}</p>
                  {achievement && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {achievement.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
