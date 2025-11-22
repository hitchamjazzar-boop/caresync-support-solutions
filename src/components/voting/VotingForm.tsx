import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Nominee {
  nominated_user_id: string;
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  };
  nomination_count: number;
}

interface VotingFormProps {
  votingPeriodId: string;
  hasVoted: boolean;
  onVoted: () => void;
}

export const VotingForm = ({ votingPeriodId, hasVoted, onVoted }: VotingFormProps) => {
  const { user } = useAuth();
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [selectedNominee, setSelectedNominee] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingNominees, setFetchingNominees] = useState(true);

  useEffect(() => {
    fetchNominees();
  }, [votingPeriodId]);

  const fetchNominees = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_nominations')
        .select('nominated_user_id')
        .eq('voting_period_id', votingPeriodId);

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
      })) || [];

      setNominees(nomineesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching nominees:', error);
      toast.error('Failed to load nominees');
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

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_votes')
        .insert({
          voting_period_id: votingPeriodId,
          nominated_user_id: selectedNominee,
          voter_user_id: user?.id
        });

      if (error) throw error;

      toast.success('Vote submitted successfully!');
      onVoted();
    } catch (error: any) {
      console.error('Error submitting vote:', error);
      if (error.message.includes('duplicate')) {
        toast.error('You have already voted in this period');
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
      <div className="text-center py-8 text-muted-foreground">
        No nominations yet. Be the first to nominate someone!
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="text-center py-8">
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
      <Label>Vote for Employee of the Month</Label>
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
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={nominee.profiles.photo_url || ''} />
                    <AvatarFallback>{nominee.profiles.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{nominee.profiles.full_name}</div>
                    <div className="text-sm text-muted-foreground">{nominee.profiles.position}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {nominee.nomination_count} {nominee.nomination_count === 1 ? 'nomination' : 'nominations'}
                    </div>
                  </div>
                </Label>
              </div>
            </Card>
          ))}
        </div>
      </RadioGroup>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Vote
      </Button>
    </form>
  );
};
