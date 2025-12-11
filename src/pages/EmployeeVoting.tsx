import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Vote, Trophy, Users, Settings, Award, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NominationForm } from '@/components/voting/NominationForm';
import { VotingForm } from '@/components/voting/VotingForm';
import { VotingResults } from '@/components/voting/VotingResults';
import { VotingPeriodManager } from '@/components/voting/VotingPeriodManager';
import { AwardCategoriesManager } from '@/components/voting/AwardCategoriesManager';
import { NomineeApprovalManager } from '@/components/voting/NomineeApprovalManager';

interface VotingPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
  created_at: string;
  closed_at: string | null;
  category_id: string | null;
  is_published: boolean;
  winner_id: string | null;
  announcement_message: string | null;
}

interface AwardCategory {
  id: string;
  name: string;
  color: string;
}

const EmployeeVoting = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [currentPeriod, setCurrentPeriod] = useState<VotingPeriod | null>(null);
  const [category, setCategory] = useState<AwardCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasNominated, setHasNominated] = useState(false);
  const [adminTab, setAdminTab] = useState('period');

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

      // Fetch category info
      if (data?.category_id) {
        const { data: categoryData } = await supabase
          .from('award_categories')
          .select('id, name, color')
          .eq('id', data.category_id)
          .maybeSingle();
        
        setCategory(categoryData);
      } else {
        setCategory(null);
      }

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
            Employee Awards Voting
          </h1>
          <p className="text-muted-foreground mt-2">
            Nominate and vote for outstanding colleagues
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/voting/history')}>
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={adminTab} onValueChange={setAdminTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="period">Voting Period</TabsTrigger>
                <TabsTrigger value="categories">Award Categories</TabsTrigger>
                <TabsTrigger value="approvals">Nominee Approvals</TabsTrigger>
              </TabsList>

              <TabsContent value="period">
                <VotingPeriodManager 
                  currentPeriod={currentPeriod} 
                  onPeriodChange={fetchCurrentPeriod}
                />
              </TabsContent>

              <TabsContent value="categories">
                <AwardCategoriesManager onCategoryChange={fetchCurrentPeriod} />
              </TabsContent>

              <TabsContent value="approvals">
                {currentPeriod ? (
                  <NomineeApprovalManager 
                    votingPeriodId={currentPeriod.id}
                    onApprovalChange={fetchCurrentPeriod}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Create a voting period first to manage nominations.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Voting Section */}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {category && (
                    <span 
                      className="px-2 py-1 rounded text-sm text-white"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name}
                    </span>
                  )}
                  {getMonthName(currentPeriod.month)} {currentPeriod.year}
                </CardTitle>
                <CardDescription>
                  {currentPeriod.status === 'open' 
                    ? 'Voting period is currently open' 
                    : currentPeriod.is_published 
                      ? 'Results have been announced' 
                      : 'This voting period has closed'}
                </CardDescription>
              </div>
            </div>
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
                  isPublished={currentPeriod.is_published}
                  categoryName={category?.name || 'Employee of the Month'}
                  month={currentPeriod.month}
                  year={currentPeriod.year}
                  onPublished={fetchCurrentPeriod}
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