import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trophy, Medal, Lock, Megaphone, Eye, EyeOff } from 'lucide-react';
import { CertificateGenerator } from '@/components/voting/CertificateGenerator';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';
import { PublishWinnerDialog } from './PublishWinnerDialog';

interface VoteResult {
  nominated_user_id: string;
  vote_count: number;
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  };
}

interface VotingResultsProps {
  votingPeriodId: string;
  isAdmin: boolean;
  status: string;
  isPublished?: boolean;
  categoryName?: string;
  month?: number;
  year?: number;
  onPublished?: () => void;
}

export const VotingResults = ({ 
  votingPeriodId, 
  isAdmin, 
  status, 
  isPublished = false,
  categoryName = 'Employee of the Month',
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  onPublished,
}: VotingResultsProps) => {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [votingPeriodId]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_votes')
        .select('nominated_user_id')
        .eq('voting_period_id', votingPeriodId);

      if (error) throw error;

      const voteMap = new Map<string, number>();
      data?.forEach((vote: any) => {
        const userId = vote.nominated_user_id;
        voteMap.set(userId, (voteMap.get(userId) || 0) + 1);
      });

      const uniqueUserIds = Array.from(voteMap.keys());

      if (uniqueUserIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      const resultsWithProfiles = profilesData?.map((profile) => ({
        nominated_user_id: profile.id,
        vote_count: voteMap.get(profile.id) || 0,
        profiles: {
          full_name: profile.full_name,
          position: profile.position || 'N/A',
          photo_url: profile.photo_url,
        },
      })) || [];

      const sortedResults = resultsWithProfiles.sort((a, b) => b.vote_count - a.vote_count);
      setResults(sortedResults);
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading results...</div>;
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No votes have been cast yet.
      </div>
    );
  }

  const winner = results.length > 0 ? results[0] : null;
  const canViewResults = status === 'closed' || isAdmin;
  const showPublicResults = status === 'closed' && isPublished;

  // Non-admin users can only see results if published
  if (!isAdmin && status === 'closed' && !isPublished) {
    return (
      <div className="text-center py-8 space-y-3">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Voting has closed. Results will be announced soon.
        </p>
        <p className="text-sm text-muted-foreground">
          The admin is reviewing the results before publishing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Status indicator */}
      {status === 'open' && isAdmin && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
          <EyeOff className="h-4 w-4" />
          Live results (only visible to admins during voting)
        </div>
      )}

      {status === 'closed' && isAdmin && !isPublished && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium">Results are private until published</span>
          </div>
          {winner && (
            <Button onClick={() => setPublishDialogOpen(true)} size="sm">
              <Megaphone className="h-4 w-4 mr-2" />
              Publish Winner
            </Button>
          )}
        </div>
      )}

      {showPublicResults && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-500/10 rounded-lg p-3">
          <Megaphone className="h-4 w-4" />
          Results have been published
        </div>
      )}

      {canViewResults && (
        <>
          {/* Winner Card */}
          {winner && (status === 'closed' || isAdmin) && (
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Trophy className="h-12 w-12 text-primary" />
                  <div>
                    <h3 className="text-xl font-bold">
                      {isPublished ? 'Winner' : 'Leading Candidate'}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <ProfileAvatarWithBadges
                        userId={winner.nominated_user_id}
                        photoUrl={winner.profiles.photo_url}
                        fullName={winner.profiles.full_name}
                        className="h-16 w-16"
                      />
                      <div>
                        <div className="font-semibold text-lg">{winner.profiles.full_name}</div>
                        <div className="text-sm text-muted-foreground">{winner.profiles.position}</div>
                        <Badge className="mt-1">{winner.vote_count} votes</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {isPublished && (
                  <CertificateGenerator 
                    employeeName={winner.profiles.full_name}
                    employeePosition={winner.profiles.position}
                    employeePhoto={winner.profiles.photo_url}
                  />
                )}
              </div>
            </Card>
          )}

          {/* All Results */}
          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={result.nominated_user_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {index < 3 && (status === 'closed' || isAdmin) && (
                      <div className="flex items-center justify-center w-8">
                        {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                        {index === 1 && <Medal className="h-6 w-6 text-gray-400" />}
                        {index === 2 && <Medal className="h-6 w-6 text-amber-600" />}
                      </div>
                    )}
                    <ProfileAvatarWithBadges
                      userId={result.nominated_user_id}
                      photoUrl={result.profiles.photo_url}
                      fullName={result.profiles.full_name}
                      className="h-12 w-12"
                    />
                    <div>
                      <div className="font-medium">{result.profiles.full_name}</div>
                      <div className="text-sm text-muted-foreground">{result.profiles.position}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{result.vote_count} votes</Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {status === 'open' && !isAdmin && (
        <div className="text-center py-8 text-muted-foreground">
          Results will be visible after the voting period closes.
        </div>
      )}

      {/* Publish Dialog */}
      {winner && (
        <PublishWinnerDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          votingPeriodId={votingPeriodId}
          winner={{
            id: winner.nominated_user_id,
            full_name: winner.profiles.full_name,
            position: winner.profiles.position,
            photo_url: winner.profiles.photo_url,
            vote_count: winner.vote_count,
          }}
          categoryName={categoryName}
          month={month}
          year={year}
          onPublished={() => {
            fetchResults();
            onPublished?.();
          }}
        />
      )}
    </div>
  );
};