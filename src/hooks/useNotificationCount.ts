import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncementVisibility } from '@/hooks/useAnnouncementVisibility';

export function useNotificationCount() {
  const { user } = useAuth();
  const { canSeeAnnouncement } = useAnnouncementVisibility();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    fetchUnreadCount();

    // Set up realtime subscriptions
    const channel = supabase
      .channel('notification-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reads',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_acknowledgments',
          filter: `user_id=eq.${user.id}`
        },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shoutout_requests',
          filter: `recipient_id=eq.${user.id}`
        },
        () => fetchUnreadCount()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_requests',
          filter: `recipient_id=eq.${user.id}`
        },
        () => fetchUnreadCount()
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

      // Get read announcements
      const { data: readAnnouncements } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      const readIds = readAnnouncements?.map(a => a.announcement_id) || [];

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
        .select('id, target_type, target_users, target_roles, target_departments, expires_at')
        .eq('is_active', true);

      // Filter announcements: not expired and user can see
      const now = new Date();
      const activeAnnouncements = (announcementData || []).filter(
        (announcement: any) => {
          const isNotExpired = !announcement.expires_at || new Date(announcement.expires_at) > now;
          const canSee = canSeeAnnouncement(announcement);
          const isRead = readIds.includes(announcement.id) || dismissedIds.includes(announcement.id) || acknowledgedIds.includes(announcement.id);
          return isNotExpired && canSee && !isRead;
        }
      );

      // Fetch pending shoutout requests (not acknowledged)
      const { data: shoutoutData } = await supabase
        .from('shoutout_requests')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      const unreadShoutouts = (shoutoutData || []).filter(s => !acknowledgedShoutoutIds.has(s.id));

      // Fetch pending feedback requests (not acknowledged)
      const { data: feedbackData } = await supabase
        .from('feedback_requests')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('status', 'pending');

      const unreadFeedbacks = (feedbackData || []).filter(f => !acknowledgedFeedbackIds.has(f.id));

      const total = activeAnnouncements.length + unreadShoutouts.length + unreadFeedbacks.length;
      setUnreadCount(total);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  return { unreadCount, refetch: fetchUnreadCount };
}
