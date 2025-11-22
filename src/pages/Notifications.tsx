import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
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

export default function Notifications() {
  const { user } = useAuth();
  const { canSeeAnnouncement } = useAnnouncementVisibility();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchReadStatus();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter announcements user can see and not expired
      const now = new Date();
      const visibleAnnouncements = (data || []).filter(
        (announcement: any) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          return isNotExpired && canSee;
        }
      );

      setAnnouncements(visibleAnnouncements);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const readIds = new Set(data?.map(r => r.announcement_id) || []);
      setReadAnnouncementIds(readIds);
    } catch (error) {
      console.error('Error fetching read status:', error);
    }
  };

  const markAsRead = async (announcementId: string) => {
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
        console.error('Error marking as read:', error);
        return;
      }

      setReadAnnouncementIds(prev => new Set([...prev, announcementId]));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || announcements.length === 0) return;

    setMarkingAllRead(true);
    try {
      const unreadIds = announcements
        .map(a => a.id)
        .filter(id => !readAnnouncementIds.has(id));

      if (unreadIds.length === 0) {
        setMarkingAllRead(false);
        return;
      }

      const readRecords = unreadIds.map(announcementId => ({
        user_id: user.id,
        announcement_id: announcementId,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('announcement_reads')
        .insert(readRecords);

      if (error) throw error;

      setReadAnnouncementIds(new Set([...readAnnouncementIds, ...unreadIds]));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (announcement: Announcement) => {
    markAsRead(announcement.id);

    // Trigger effects based on announcement type
    const title = announcement.title.toLowerCase();
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
  };

  const unreadCount = announcements.filter(a => !readAnnouncementIds.has(a.id)).length;

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
        {user && announcements.length > 0 && (
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

      {announcements.length === 0 ? (
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
          {announcements.map((announcement) => {
            const isUnread = !readAnnouncementIds.has(announcement.id);

            return (
              <Card
                key={announcement.id}
                className={`cursor-pointer transition-all ${
                  isUnread
                    ? 'bg-accent/40 border-primary/30 hover:bg-accent/60'
                    : 'hover:bg-accent/20'
                }`}
                onClick={() => handleNotificationClick(announcement)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {announcement.is_pinned && (
                        <span className="text-lg" title="Pinned">
                          📌
                        </span>
                      )}
                      <CardTitle className="text-base flex items-center gap-2">
                        {announcement.title}
                        {isUnread && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 h-5 leading-none animate-pulse"
                          >
                            New
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(announcement.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
