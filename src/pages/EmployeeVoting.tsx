import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Vote, Trophy, Users } from 'lucide-react';
import { NominationForm } from '@/components/voting/NominationForm';
import { VotingForm } from '@/components/voting/VotingForm';
import { VotingResults } from '@/components/voting/VotingResults';
import { VotingPeriodManager } from '@/components/voting/VotingPeriodManager';

interface VotingPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
  created_at: string;
  closed_at: string | null;
}

const EmployeeVoting = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [currentPeriod, setCurrentPeriod] = useState<VotingPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasNominated, setHasNominated] = useState(false);

  useEffect(() => {
    fetchCurrentPeriod();
  }, []);

  const fetchCurrentPeriod = async () => {
    try {
      const { data, error } = await supabase
        .from('voting_periods')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentPeriod(data);

      if (data && user) {
        // Check if user has voted
        const { data: voteData } = await supabase
          .from('employee_votes')
          .select('id')
          .eq('voting_period_id', data.id)
          .eq('voter_user_id', user.id)
          .maybeSingle();

        setHasVoted(!!voteData);

        // Check if user has nominated
        const { data: nominationData } = await supabase
          .from('employee_nominations')
          .select('id')
          .eq('voting_period_id', data.id)
          .eq('nominator_user_id', user.id)
          .limit(1)
          .maybeSingle();

        setHasNominated(!!nominationData);
      }
    } catch (error: any) {
      console.error('Error fetching voting period:', error);
      toast.error('Failed to load voting period');
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Employee of the Month Voting
          </h1>
          <p className="text-muted-foreground mt-2">
            Nominate and vote for outstanding colleagues
          </p>
        </div>
      </div>

      {isAdmin && (
        <VotingPeriodManager 
          currentPeriod={currentPeriod} 
          onPeriodChange={fetchCurrentPeriod}
        />
      )}

      {!currentPeriod ? (
        <Card>
          <CardHeader>
            <CardTitle>No Active Voting Period</CardTitle>
            <CardDescription>
              {isAdmin 
                ? 'Create a new voting period to allow employees to nominate and vote.'
                : 'There is no active voting period at the moment. Check back later!'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Voting for {getMonthName(currentPeriod.month)} {currentPeriod.year}
            </CardTitle>
            <CardDescription>
              {currentPeriod.status === 'open' 
                ? 'Voting period is currently open' 
                : 'This voting period has closed'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="nominate" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="nominate" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Nominate
                </TabsTrigger>
                <TabsTrigger value="vote" className="flex items-center gap-2">
                  <Vote className="h-4 w-4" />
                  Vote
                </TabsTrigger>
                <TabsTrigger value="results" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="nominate">
                {currentPeriod.status === 'open' ? (
                  <NominationForm 
                    votingPeriodId={currentPeriod.id}
                    hasNominated={hasNominated}
                    onNominated={() => {
                      setHasNominated(true);
                      fetchCurrentPeriod();
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Voting period has closed
                  </div>
                )}
              </TabsContent>

              <TabsContent value="vote">
                {currentPeriod.status === 'open' ? (
                  <VotingForm 
                    votingPeriodId={currentPeriod.id}
                    hasVoted={hasVoted}
                    onVoted={() => {
                      setHasVoted(true);
                      fetchCurrentPeriod();
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Voting period has closed
                  </div>
                )}
              </TabsContent>

              <TabsContent value="results">
                <VotingResults 
                  votingPeriodId={currentPeriod.id}
                  isAdmin={isAdmin}
                  status={currentPeriod.status}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeVoting;
