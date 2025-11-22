import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trophy, Medal } from 'lucide-react';
import { CertificateGenerator } from '@/components/voting/CertificateGenerator';

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
}

export const VotingResults = ({ votingPeriodId, isAdmin, status }: VotingResultsProps) => {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [votingPeriodId]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_votes')
        .select(`
          nominated_user_id,
          profiles:nominated_user_id (
            full_name,
            position,
            photo_url
          )
        `)
        .eq('voting_period_id', votingPeriodId);

      if (error) throw error;

      // Count votes per nominee
      const voteMap = new Map<string, VoteResult>();
      data?.forEach((vote: any) => {
        const userId = vote.nominated_user_id;
        if (voteMap.has(userId)) {
          voteMap.get(userId)!.vote_count++;
        } else {
          voteMap.set(userId, {
            nominated_user_id: userId,
            vote_count: 1,
            profiles: vote.profiles
          });
        }
      });

      const sortedResults = Array.from(voteMap.values()).sort((a, b) => b.vote_count - a.vote_count);
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

  const winner = status === 'closed' && results.length > 0 ? results[0] : null;

  return (
    <div className="space-y-4 py-4">
      {status === 'open' && (
        <div className="text-sm text-muted-foreground text-center mb-4">
          {isAdmin 
            ? 'Current standings (only visible to admins during voting)' 
            : 'Results will be visible after the voting period closes'}
        </div>
      )}

      {(status === 'closed' || isAdmin) && (
        <>
          {winner && status === 'closed' && (
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Trophy className="h-12 w-12 text-primary" />
                  <div>
                    <h3 className="text-xl font-bold">Winner</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={winner.profiles.photo_url || ''} />
                        <AvatarFallback>{winner.profiles.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-lg">{winner.profiles.full_name}</div>
                        <div className="text-sm text-muted-foreground">{winner.profiles.position}</div>
                        <Badge className="mt-1">{winner.vote_count} votes</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <CertificateGenerator 
                  employeeName={winner.profiles.full_name}
                  employeePosition={winner.profiles.position}
                  employeePhoto={winner.profiles.photo_url}
                />
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={result.nominated_user_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {index < 3 && status === 'closed' && (
                      <div className="flex items-center justify-center w-8">
                        {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                        {index === 1 && <Medal className="h-6 w-6 text-gray-400" />}
                        {index === 2 && <Medal className="h-6 w-6 text-amber-600" />}
                      </div>
                    )}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={result.profiles.photo_url || ''} />
                      <AvatarFallback>{result.profiles.full_name[0]}</AvatarFallback>
                    </Avatar>
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
    </div>
  );
};
