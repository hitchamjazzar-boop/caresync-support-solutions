import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    photo_url: string | null;
  };
}

interface AnnouncementCommentsProps {
  announcementId: string;
}

export function AnnouncementComments({ announcementId }: AnnouncementCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${announcementId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcement_comments',
          filter: `announcement_id=eq.${announcementId}`,
        },
        async (payload) => {
          // Fetch profile for new comment
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, photo_url')
            .eq('id', payload.new.user_id)
            .single();

          const newComment: Comment = {
            ...(payload.new as any),
            profiles: profile || {
              full_name: 'Unknown User',
              photo_url: null,
            },
          };

          setComments((prev) => [...prev, newComment]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'announcement_comments',
          filter: `announcement_id=eq.${announcementId}`,
        },
        (payload) => {
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [announcementId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_comments')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = data.map(c => c.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, photo_url')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));
        
        const commentsWithProfiles = data.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || {
            full_name: 'Unknown User',
            photo_url: null,
          },
        }));

        setComments(commentsWithProfiles as Comment[]);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('announcement_comments')
        .insert({
          announcement_id: announcementId,
          user_id: user?.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      toast({
        title: 'Success',
        description: 'Comment posted',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        <span>Comments ({comments.length})</span>
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <Card key={comment.id} className="p-3">
            <div className="flex gap-3">
              <ProfileAvatarWithBadges
                userId={comment.user_id}
                photoUrl={comment.profiles.photo_url}
                fullName={comment.profiles.full_name}
                className="h-8 w-8"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.profiles.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.comment}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          className="flex-1"
          maxLength={500}
        />
        <Button type="submit" disabled={submitting || !newComment.trim()} size="icon">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
