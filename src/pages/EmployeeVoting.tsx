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
  requires_nomination: boolean;
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
  const [openPeriods, setOpenPeriods] = useState<VotingPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<VotingPeriod | null>(null);
  const [category, setCategory] = useState<AwardCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasNominated, setHasNominated] = useState(false);
  const [adminTab, setAdminTab] = useState('period');

  useEffect(() => {
    fetchOpenPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchCategoryAndUserStatus(selectedPeriod);
    }
  }, [selectedPeriod, user]);

  const fetchOpenPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('voting_periods')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpenPeriods(data || []);
      
      // Select the first period by default
      if (data && data.length > 0) {
        setSelectedPeriod(data[0]);
      } else {
        setSelectedPeriod(null);
        setCategory(null);
      }
    } catch (error: any) {
      console.error('Error fetching voting periods:', error);
      toast.error('Failed to load voting periods');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryAndUserStatus = async (period: VotingPeriod) => {
    try {
      // Fetch category info
      if (period.category_id) {
        const { data: categoryData } = await supabase
          .from('award_categories')
          .select('id, name, color')
          .eq('id', period.category_id)
          .maybeSingle();
        
        setCategory(categoryData);
      } else {
        setCategory(null);
      }

      if (user) {
        // Check if user has voted
        const { data: voteData } = await supabase
          .from('employee_votes')
          .select('id')
          .eq('voting_period_id', period.id)
          .eq('voter_user_id', user.id)
          .maybeSingle();

        setHasVoted(!!voteData);

        // Check if user has nominated
        const { data: nominationData } = await supabase
          .from('employee_nominations')
          .select('id')
          .eq('voting_period_id', period.id)
          .eq('nominator_user_id', user.id)
          .limit(1)
          .maybeSingle();

        setHasNominated(!!nominationData);
      }
    } catch (error: any) {
      console.error('Error fetching category/status:', error);
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
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
            Employee Awards Voting
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Nominate and vote for outstanding colleagues
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/voting/history')} className="w-full sm:w-auto">
          <History className="h-4 w-4 mr-2" />
          View History
        </Button>
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 sm:h-5 w-4 sm:w-5" />
              Admin Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <Tabs value={adminTab} onValueChange={setAdminTab}>
              <TabsList className="w-full grid grid-cols-3 mb-4 h-auto">
                <TabsTrigger value="period" className="text-xs sm:text-sm px-2 py-2">Voting Period</TabsTrigger>
                <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 py-2">Categories</TabsTrigger>
                <TabsTrigger value="approvals" className="text-xs sm:text-sm px-2 py-2">Approvals</TabsTrigger>
              </TabsList>

              <TabsContent value="period">
                <VotingPeriodManager 
                  openPeriods={openPeriods} 
                  onPeriodChange={fetchOpenPeriods}
                />
              </TabsContent>

              <TabsContent value="categories">
                <AwardCategoriesManager onCategoryChange={fetchOpenPeriods} />
              </TabsContent>

              <TabsContent value="approvals">
                {selectedPeriod ? (
                  <NomineeApprovalManager 
                    votingPeriodId={selectedPeriod.id}
                    onApprovalChange={fetchOpenPeriods}
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
      {openPeriods.length === 0 ? (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">No Active Voting Periods</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isAdmin 
                ? 'Create a new voting period to allow employees to nominate and vote.'
                : 'There are no active voting periods at the moment. Check back later!'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Period Selector (if multiple) */}
          {openPeriods.length > 1 && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-2">
                {openPeriods.map((period) => {
                  const periodCategory = period.category_id;
                  return (
                    <Button
                      key={period.id}
                      variant={selectedPeriod?.id === period.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPeriod(period)}
                    >
                      {getMonthName(period.month)} {period.year}
                    </Button>
                  );
                })}
              </div>
            </Card>
          )}

          {selectedPeriod && (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                      {category && (
                        <span 
                          className="px-2 py-1 rounded text-xs sm:text-sm text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                      {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {selectedPeriod.status === 'open' 
                        ? 'Voting period is currently open' 
                        : selectedPeriod.is_published 
                          ? 'Results have been announced' 
                          : 'This voting period has closed'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Tabs defaultValue={selectedPeriod.requires_nomination ? "nominate" : "vote"} className="w-full">
                  <TabsList className={`w-full grid h-auto ${selectedPeriod.requires_nomination ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {selectedPeriod.requires_nomination && (
                      <TabsTrigger value="nominate" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                        <Users className="h-3 sm:h-4 w-3 sm:w-4" />
                        <span className="hidden sm:inline">Nominate</span>
                        <span className="sm:hidden">Nom.</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="vote" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                      <Vote className="h-3 sm:h-4 w-3 sm:w-4" />
                      Vote
                    </TabsTrigger>
                    <TabsTrigger value="results" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2">
                      <Trophy className="h-3 sm:h-4 w-3 sm:w-4" />
                      Results
                    </TabsTrigger>
                  </TabsList>

                  {selectedPeriod.requires_nomination && (
                    <TabsContent value="nominate">
                      {selectedPeriod.status === 'open' ? (
                        <NominationForm 
                          votingPeriodId={selectedPeriod.id}
                          hasNominated={hasNominated}
                          onNominated={() => {
                            setHasNominated(true);
                            fetchOpenPeriods();
                          }}
                        />
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Voting period has closed
                        </div>
                      )}
                    </TabsContent>
                  )}

                  <TabsContent value="vote">
                    {selectedPeriod.status === 'open' ? (
                      <VotingForm 
                        votingPeriodId={selectedPeriod.id}
                        hasVoted={hasVoted}
                        requiresNomination={selectedPeriod.requires_nomination}
                        onVoted={() => {
                          setHasVoted(true);
                          fetchOpenPeriods();
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
                      votingPeriodId={selectedPeriod.id}
                      isAdmin={isAdmin}
                      status={selectedPeriod.status}
                      isPublished={selectedPeriod.is_published}
                      categoryName={category?.name || 'Employee of the Month'}
                      month={selectedPeriod.month}
                      year={selectedPeriod.year}
                      onPublished={fetchOpenPeriods}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeVoting;