import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Award, Loader2, Share2 } from 'lucide-react';
import { triggerAchievementConfetti } from '@/lib/confetti';

interface ShareAchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: {
    id: string;
    achievement_type: {
      name: string;
      description: string;
      color: string;
    };
    reason: string;
    awarded_date: string;
  };
}

export function ShareAchievementDialog({
  open,
  onOpenChange,
  achievement,
}: ShareAchievementDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!user) return;

    setSharing(true);

    try {
      const announcementTitle = `🏆 Achievement Unlocked: ${achievement.achievement_type.name}`;
      const announcementContent = message.trim() 
        ? message 
        : `I'm proud to share that I've received the "${achievement.achievement_type.name}" achievement! ${achievement.reason || ''}`;

      const { error } = await supabase.from('announcements').insert({
        title: announcementTitle,
        content: announcementContent,
        created_by: user.id,
        featured_user_id: user.id,
        target_type: 'all',
        is_active: true,
        is_pinned: false,
      });

      if (error) throw error;

      triggerAchievementConfetti();

      toast.success('Achievement shared successfully!', {
        description: 'Your achievement has been posted to announcements',
      });

      onOpenChange(false);
      setMessage('');
    } catch (error: any) {
      console.error('Error sharing achievement:', error);
      toast.error('Failed to share achievement', {
        description: error.message,
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Achievement
          </DialogTitle>
          <DialogDescription>
            Share your achievement with everyone in the company
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${achievement.achievement_type.color}20` }}
              >
                <Award
                  className="h-5 w-5"
                  style={{ color: achievement.achievement_type.color }}
                />
              </div>
              <div>
                <h3 className="font-semibold">{achievement.achievement_type.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {achievement.achievement_type.description}
                </p>
                {achievement.reason && (
                  <p className="text-sm mt-2 text-foreground">{achievement.reason}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Add a message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Share your thoughts about this achievement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sharing}
            >
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={sharing}>
              {sharing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Achievement
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
