import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Nominee {
  nominated_user_id: string;
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  };
  nomination_count: number;
  is_approved: boolean;
}

interface VotingFormProps {
  votingPeriodId: string;
  hasVoted: boolean;
  requiresNomination: boolean;
  onVoted: () => void;
}

export const VotingForm = ({ votingPeriodId, hasVoted, requiresNomination, onVoted }: VotingFormProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedNominee, setSelectedNominee] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingNominees, setFetchingNominees] = useState(true);

  useEffect(() => {
    if (requiresNomination) {
      fetchApprovedNominees();
    } else {
      fetchAllEmployees();
    }
  }, [votingPeriodId, requiresNomination]);

  const fetchApprovedNominees = async () => {
    try {
      // Only fetch approved nominations
      const { data, error } = await supabase
        .from('employee_nominations')
        .select('nominated_user_id, is_approved')
        .eq('voting_period_id', votingPeriodId)
        .eq('is_approved', true);

      if (error) throw error;

      const nomineeMap = new Map<string, number>();
      data?.forEach((nomination: any) => {
        const userId = nomination.nominated_user_id;
        nomineeMap.set(userId, (nomineeMap.get(userId) || 0) + 1);
      });

      const uniqueUserIds = Array.from(nomineeMap.keys());

      if (uniqueUserIds.length === 0) {
        setNominees([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      const nomineesWithProfiles = profilesData?.map((profile) => ({
        nominated_user_id: profile.id,
        profiles: {
          full_name: profile.full_name,
          position: profile.position || 'N/A',
          photo_url: profile.photo_url,
        },
        nomination_count: nomineeMap.get(profile.id) || 1,
        is_approved: true,
      })) || [];

      setNominees(nomineesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching nominees:', error);
      toast.error('Failed to load nominees');
    } finally {
      setFetchingNominees(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      // Fetch all employees except the current user
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .neq('id', user?.id || '')
        .order('full_name');

      if (profilesError) throw profilesError;

      const allEmployees = profilesData?.map((profile) => ({
        nominated_user_id: profile.id,
        profiles: {
          full_name: profile.full_name,
          position: profile.position || 'N/A',
          photo_url: profile.photo_url,
        },
        nomination_count: 0,
        is_approved: true,
      })) || [];

      setNominees(allEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setFetchingNominees(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNominee) {
      toast.error('Please select a nominee');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for your vote');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_votes')
        .insert({
          voting_period_id: votingPeriodId,
          nominated_user_id: selectedNominee,
          voter_user_id: user?.id,
          reason: reason.trim(),
          is_admin_vote: isAdmin
        });

      if (error) throw error;

      toast.success('Vote submitted successfully!');
      onVoted();
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      if (error.message.includes('duplicate')) {
        toast.error('You have already voted in this period');
      } else if (error.message.includes('row-level security')) {
        toast.error('This nominee has not been approved for voting yet');
      } else {
        toast.error('Failed to submit vote');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchingNominees) {
    return <div className="text-center py-8">Loading nominees...</div>;
  }

  if (nominees.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">
          {requiresNomination ? 'No approved nominees yet.' : 'No employees available for voting.'}
        </p>
        {requiresNomination && (
          <p className="text-sm text-muted-foreground">
            Nominations need to be approved by an admin before voting can begin.
          </p>
        )}
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
        <p className="text-muted-foreground">
          Thank you for voting! Your vote has been recorded.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Check the Results tab to see the current standings.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <Label>Vote for your choice</Label>
        <Badge variant="outline">
          {nominees.length} {requiresNomination ? 'approved' : ''} {nominees.length === 1 ? 'candidate' : 'candidates'}
        </Badge>
      </div>
      
      <RadioGroup value={selectedNominee} onValueChange={setSelectedNominee}>
        <div className="space-y-3">
          {nominees.map((nominee) => (
            <Card key={nominee.nominated_user_id} className="p-4">
              <div className="flex items-center space-x-4">
                <RadioGroupItem
                  value={nominee.nominated_user_id}
                  id={nominee.nominated_user_id}
                />
                <Label
                  htmlFor={nominee.nominated_user_id}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <ProfileAvatarWithBadges
                    userId={nominee.nominated_user_id}
                    photoUrl={nominee.profiles.photo_url}
                    fullName={nominee.profiles.full_name}
                    className="h-12 w-12"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{nominee.profiles.full_name}</div>
                    <div className="text-sm text-muted-foreground">{nominee.profiles.position}</div>
                  </div>
                </Label>
              </div>
            </Card>
          ))}
        </div>
      </RadioGroup>

      <div className="space-y-2">
        <Label htmlFor="reason">Why are you voting for this person? *</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Share your reason for voting for this employee..."
          className="min-h-[100px]"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
      </div>

      <Button type="submit" disabled={loading || !selectedNominee || !reason.trim()} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Vote
      </Button>
    </form>
  );
};