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

// Default weights when no admin weight is set (equal votes)
const DEFAULT_ADMIN_WEIGHT = 0.5;
const DEFAULT_REGULAR_WEIGHT = 0.5;

interface Voter {
  voter_user_id: string;
  reason: string | null;
  voter_name: string;
  voter_photo: string | null;
  is_admin_vote: boolean;
}

interface VoteResult {
  nominated_user_id: string;
  vote_count: number;
  weighted_score: number;
  admin_votes: number;
  regular_votes: number;
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
  categoryId?: string | null;
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
  categoryId = null,
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  onPublished,
}: VotingResultsProps) => {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [adminVoteWeight, setAdminVoteWeight] = useState<number | null>(null);

  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategoryWeight();
    fetchResults();
  }, [votingPeriodId, categoryId]);

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

  const fetchCategoryWeight = async () => {
    if (!categoryId) {
      setAdminVoteWeight(null);
      return;
    }
    
    try {
      const { data } = await supabase
        .from('award_categories')
        .select('admin_vote_weight')
        .eq('id', categoryId)
        .maybeSingle();
      
      setAdminVoteWeight(data?.admin_vote_weight ?? null);
    } catch (error) {
      console.error('Error fetching category weight:', error);
    }
  };

  const fetchResults = async () => {
    try {
      // Fetch all votes with voter info and admin status
      const { data, error } = await supabase
        .from('employee_votes')
        .select('nominated_user_id, voter_user_id, reason, is_admin_vote')
        .eq('voting_period_id', votingPeriodId);

      if (error) throw error;

      // Group votes by nominated user with admin tracking
      const voteMap = new Map<string, { 
        count: number; 
        adminVotes: number;
        regularVotes: number;
        voters: { voter_user_id: string; reason: string | null; is_admin_vote: boolean }[] 
      }>();
      
      data?.forEach((vote: any) => {
        const userId = vote.nominated_user_id;
        if (!voteMap.has(userId)) {
          voteMap.set(userId, { count: 0, adminVotes: 0, regularVotes: 0, voters: [] });
        }
        const entry = voteMap.get(userId)!;
        entry.count++;
        if (vote.is_admin_vote) {
          entry.adminVotes++;
        } else {
          entry.regularVotes++;
        }
        entry.voters.push({ 
          voter_user_id: vote.voter_user_id, 
          reason: vote.reason,
          is_admin_vote: vote.is_admin_vote 
        });
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

      // Calculate total admin and regular votes across all nominees for percentage
      const totalAdminVotes = Array.from(voteMap.values()).reduce((sum, v) => sum + v.adminVotes, 0);
      const totalRegularVotes = Array.from(voteMap.values()).reduce((sum, v) => sum + v.regularVotes, 0);

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

        // Calculate weighted score based on category settings
        // If adminVoteWeight is set in category, use it; otherwise equal weight
        const effectiveAdminWeight = adminVoteWeight !== null ? adminVoteWeight / 100 : DEFAULT_ADMIN_WEIGHT;
        const effectiveRegularWeight = adminVoteWeight !== null ? (100 - adminVoteWeight) / 100 : DEFAULT_REGULAR_WEIGHT;
        
        const adminScore = totalAdminVotes > 0 
          ? ((voteInfo?.adminVotes || 0) / totalAdminVotes) * effectiveAdminWeight * 100
          : 0;
        const regularScore = totalRegularVotes > 0
          ? ((voteInfo?.regularVotes || 0) / totalRegularVotes) * effectiveRegularWeight * 100
          : 0;
        const weightedScore = adminScore + regularScore;

        return {
          nominated_user_id: profile.id,
          vote_count: voteInfo?.count || 0,
          weighted_score: weightedScore,
          admin_votes: voteInfo?.adminVotes || 0,
          regular_votes: voteInfo?.regularVotes || 0,
          profiles: {
            full_name: profile.full_name,
            position: profile.position || 'N/A',
            photo_url: profile.photo_url,
          },
          voters: votersWithNames,
        };
      }) || [];

      // Sort by weighted score instead of raw vote count
      const sortedResults = resultsWithProfiles.sort((a, b) => b.weighted_score - a.weighted_score);
      setResults(sortedResults);
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleGoLive = async () => {
    setGoingLive(true);
    try {
      const { error } = await supabase
        .from('voting_periods')
        .update({ 
          is_published: true, 
          published_at: new Date().toISOString(),
          winner_id: results[0]?.nominated_user_id
        })
        .eq('id', votingPeriodId);

      if (error) throw error;

      toast.success('Results are now live!');
      onPublished?.();
    } catch (error: any) {
      console.error('Error publishing results:', error);
      toast.error('Failed to publish results');
    } finally {
      setGoingLive(false);
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium">Results are private until published</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleGoLive} 
              disabled={goingLive || results.length === 0}
              size="sm"
              variant="default"
            >
              {goingLive ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Publishing...
                </span>
              ) : (
                <>
                  <Megaphone className="h-4 w-4 mr-2" />
                  Go Live Results
                </>
              )}
            </Button>
            {winner && (
              <Button onClick={() => setPublishDialogOpen(true)} size="sm" variant="outline">
                Customize & Publish
              </Button>
            )}
          </div>
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge>{winner.vote_count} votes</Badge>
                          <Badge variant="outline">{winner.weighted_score.toFixed(1)}% score</Badge>
                        </div>
                        {isAdmin && adminVoteWeight !== null && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Admin: {winner.admin_votes} ({adminVoteWeight}% weight) · Regular: {winner.regular_votes} ({100 - adminVoteWeight}% weight)
                          </div>
                        )}
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
                      <div className="flex flex-col items-end">
                        <Badge variant="secondary">{result.vote_count} votes</Badge>
                        {isAdmin && adminVoteWeight !== null && (
                          <span className="text-xs text-muted-foreground mt-1">
                            {result.weighted_score.toFixed(1)}% score
                          </span>
                        )}
                      </div>
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
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{voter.voter_name}</p>
                              {voter.is_admin_vote && (
                                <Badge variant="outline" className="text-xs">Admin</Badge>
                              )}
                            </div>
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