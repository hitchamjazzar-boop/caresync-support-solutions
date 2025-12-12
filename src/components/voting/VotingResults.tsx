import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Trophy, Medal, Lock, Megaphone, Eye, EyeOff, ChevronDown, MessageSquare } from 'lucide-react';
import { CertificateGenerator } from '@/components/voting/CertificateGenerator';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';
import { PublishWinnerDialog } from './PublishWinnerDialog';

interface Voter {
  voter_user_id: string;
  reason: string | null;
  voter_name: string;
  voter_photo: string | null;
}

interface VoteResult {
  nominated_user_id: string;
  vote_count: number;
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  };
  voters: Voter[];
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

  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchResults();
  }, [votingPeriodId]);

  const toggleExpanded = (userId: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const fetchResults = async () => {
    try {
      // Fetch all votes with voter info
      const { data, error } = await supabase
        .from('employee_votes')
        .select('nominated_user_id, voter_user_id, reason')
        .eq('voting_period_id', votingPeriodId);

      if (error) throw error;

      // Group votes by nominated user
      const voteMap = new Map<string, { count: number; voters: { voter_user_id: string; reason: string | null }[] }>();
      data?.forEach((vote: any) => {
        const userId = vote.nominated_user_id;
        if (!voteMap.has(userId)) {
          voteMap.set(userId, { count: 0, voters: [] });
        }
        const entry = voteMap.get(userId)!;
        entry.count++;
        entry.voters.push({ voter_user_id: vote.voter_user_id, reason: vote.reason });
      });

      const uniqueUserIds = Array.from(voteMap.keys());
      const allVoterIds = data?.map((v: any) => v.voter_user_id) || [];
      const uniqueVoterIds = [...new Set(allVoterIds)];

      if (uniqueUserIds.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Fetch nominee profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', uniqueUserIds);

      if (profilesError) throw profilesError;

      // Fetch voter profiles
      const { data: voterProfilesData } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .in('id', uniqueVoterIds);

      const voterProfilesMap = new Map(voterProfilesData?.map(p => [p.id, p]) || []);

      const resultsWithProfiles = profilesData?.map((profile) => {
        const voteInfo = voteMap.get(profile.id);
        const votersWithNames = voteInfo?.voters.map(v => {
          const voterProfile = voterProfilesMap.get(v.voter_user_id);
          return {
            ...v,
            voter_name: voterProfile?.full_name || 'Unknown',
            voter_photo: voterProfile?.photo_url || null
          };
        }) || [];

        return {
          nominated_user_id: profile.id,
          vote_count: voteInfo?.count || 0,
          profiles: {
            full_name: profile.full_name,
            position: profile.position || 'N/A',
            photo_url: profile.photo_url,
          },
          voters: votersWithNames,
        };
      }) || [];

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
              <Collapsible
                key={result.nominated_user_id}
                open={expandedResults.has(result.nominated_user_id)}
                onOpenChange={() => toggleExpanded(result.nominated_user_id)}
              >
                <Card className="p-4">
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{result.vote_count} votes</Badge>
                      {isAdmin && result.voters.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            <ChevronDown className={`h-4 w-4 transition-transform ${expandedResults.has(result.nominated_user_id) ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <CollapsibleContent className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Voters & Reasons:</p>
                      {result.voters.map((voter, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <ProfileAvatarWithBadges
                            userId={voter.voter_user_id}
                            photoUrl={voter.voter_photo}
                            fullName={voter.voter_name}
                            className="h-8 w-8"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{voter.voter_name}</p>
                            {voter.reason && (
                              <p className="text-sm text-muted-foreground mt-1">"{voter.reason}"</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  )}
                </Card>
              </Collapsible>
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