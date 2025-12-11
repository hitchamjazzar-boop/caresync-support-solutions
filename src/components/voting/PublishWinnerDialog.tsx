import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Megaphone } from 'lucide-react';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Winner {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
  vote_count: number;
}

interface PublishWinnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  votingPeriodId: string;
  winner: Winner;
  categoryName: string;
  month: number;
  year: number;
  onPublished: () => void;
}

export const PublishWinnerDialog = ({
  open,
  onOpenChange,
  votingPeriodId,
  winner,
  categoryName,
  month,
  year,
  onPublished,
}: PublishWinnerDialogProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState(
    `Congratulations to ${winner.full_name} for being selected as our ${categoryName} for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}! 🎉\n\nThank you to everyone who participated in the voting.`
  );
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Update voting period with winner
      const { error: periodError } = await supabase
        .from('voting_periods')
        .update({
          winner_id: winner.id,
          is_published: true,
          announcement_message: message.trim(),
          published_at: new Date().toISOString(),
        })
        .eq('id', votingPeriodId);

      if (periodError) throw periodError;

      // Create announcement
      const { error: announcementError } = await supabase
        .from('announcements')
        .insert({
          title: `🏆 ${categoryName} - ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
          content: message.trim(),
          created_by: user?.id,
          is_active: true,
          is_pinned: true,
          featured_user_id: winner.id,
          featured_user_ids: [winner.id],
          target_type: 'all',
        });

      if (announcementError) throw announcementError;

      toast.success('Winner published successfully!');
      onOpenChange(false);
      onPublished();
    } catch (error: any) {
      console.error('Error publishing winner:', error);
      toast.error('Failed to publish winner');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Publish Winner
          </DialogTitle>
          <DialogDescription>
            Confirm the winner and publish the announcement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Winner Preview */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
            <ProfileAvatarWithBadges
              userId={winner.id}
              photoUrl={winner.photo_url}
              fullName={winner.full_name}
              className="h-16 w-16"
            />
            <div>
              <div className="font-semibold text-lg">{winner.full_name}</div>
              <div className="text-sm text-muted-foreground">{winner.position || 'N/A'}</div>
              <div className="text-sm text-primary mt-1">{winner.vote_count} votes</div>
            </div>
          </div>

          {/* Announcement Message */}
          <div className="space-y-2">
            <Label>Announcement Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
              placeholder="Write a message to accompany the announcement..."
            />
            <p className="text-xs text-muted-foreground">
              This message will be displayed in the public announcement.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Winner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};