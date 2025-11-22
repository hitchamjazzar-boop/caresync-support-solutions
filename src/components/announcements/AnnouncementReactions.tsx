import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Reaction {
  id: string;
  reaction_type: string;
  user_id: string;
}

interface ReactionCount {
  type: string;
  count: number;
  hasReacted: boolean;
}

interface AnnouncementReactionsProps {
  announcementId: string;
}

const reactionEmojis = {
  like: { emoji: '👍', label: 'Like' },
  love: { emoji: '❤️', label: 'Love' },
  celebrate: { emoji: '🎉', label: 'Celebrate' },
  clap: { emoji: '👏', label: 'Clap' },
  fire: { emoji: '🔥', label: 'Fire' },
};

export function AnnouncementReactions({ announcementId }: AnnouncementReactionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions-${announcementId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reactions',
          filter: `announcement_id=eq.${announcementId}`,
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [announcementId]);

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('announcement_reactions')
        .select('*')
        .eq('announcement_id', announcementId);

      if (error) throw error;

      setReactions(data || []);
    } catch (error: any) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReactionCounts = (): ReactionCount[] => {
    const counts: Record<string, ReactionCount> = {};

    Object.keys(reactionEmojis).forEach((type) => {
      counts[type] = {
        type,
        count: 0,
        hasReacted: false,
      };
    });

    reactions.forEach((reaction) => {
      if (counts[reaction.reaction_type]) {
        counts[reaction.reaction_type].count++;
        if (reaction.user_id === user?.id) {
          counts[reaction.reaction_type].hasReacted = true;
        }
      }
    });

    return Object.values(counts);
  };

  const toggleReaction = async (reactionType: string) => {
    if (!user) return;

    try {
      const existingReaction = reactions.find(
        (r) => r.reaction_type === reactionType && r.user_id === user.id
      );

      if (existingReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('announcement_reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('announcement_reactions')
          .insert({
            announcement_id: announcementId,
            user_id: user.id,
            reaction_type: reactionType,
          });

        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) return null;

  const reactionCounts = getReactionCounts();

  return (
    <div className="flex flex-wrap gap-2">
      {reactionCounts.map((reaction) => {
        const { emoji, label } = reactionEmojis[reaction.type as keyof typeof reactionEmojis];
        const hasCount = reaction.count > 0;

        return (
          <Button
            key={reaction.type}
            variant="outline"
            size="sm"
            onClick={() => toggleReaction(reaction.type)}
            className={cn(
              'gap-1 transition-all',
              reaction.hasReacted && 'bg-primary/10 border-primary hover:bg-primary/20'
            )}
          >
            <span className="text-base">{emoji}</span>
            {hasCount && (
              <span className="text-xs font-medium">{reaction.count}</span>
            )}
            <span className="sr-only">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
