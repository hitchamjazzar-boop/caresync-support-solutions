import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, Award, Trophy, Calendar, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAdmin } from '@/hooks/useAdmin';

interface AwardCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface VotingPeriodWithWinner {
  id: string;
  month: number;
  year: number;
  status: string;
  is_published: boolean;
  published_at: string | null;
  announcement_message: string | null;
  category_id: string | null;
  winner_id: string | null;
  closed_at: string | null;
  category: AwardCategory | null;
  winner: {
    id: string;
    full_name: string;
    photo_url: string | null;
    position: string | null;
    department: string | null;
  } | null;
  vote_count: number;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function VotingHistory() {
  const { isAdmin } = useAdmin();
  const [periods, setPeriods] = useState<VotingPeriodWithWinner[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('award_categories')
        .select('*')
        .order('name');

      setCategories(categoriesData || []);

      // Fetch published voting periods
      const { data: periodsData, error } = await supabase
        .from('voting_periods')
        .select('*')
        .eq('is_published', true)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      // Get unique years for filter
      const years = [...new Set((periodsData || []).map(p => p.year))];
      setAvailableYears(years);

      // Fetch winner profiles and vote counts for each period
      const periodsWithDetails = await Promise.all(
        (periodsData || []).map(async (period) => {
          let winner = null;
          let category = null;
          let voteCount = 0;

          // Get category
          if (period.category_id) {
            category = categoriesData?.find(c => c.id === period.category_id) || null;
          }

          // Get winner profile
          if (period.winner_id) {
            const { data: winnerData } = await supabase
              .from('profiles')
              .select('id, full_name, photo_url, position, department')
              .eq('id', period.winner_id)
              .maybeSingle();

            winner = winnerData;

            // Get vote count for winner
            const { count } = await supabase
              .from('employee_votes')
              .select('*', { count: 'exact', head: true })
              .eq('voting_period_id', period.id)
              .eq('nominated_user_id', period.winner_id);

            voteCount = count || 0;
          }

          return {
            ...period,
            category,
            winner,
            vote_count: voteCount,
          };
        })
      );

      setPeriods(periodsWithDetails);
    } catch (error) {
      console.error('Error fetching voting history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (periodId: string) => {
    setDeleting(periodId);
    try {
      // Delete related votes first
      await supabase.from('employee_votes').delete().eq('voting_period_id', periodId);
      // Delete related nominations
      await supabase.from('employee_nominations').delete().eq('voting_period_id', periodId);
      // Delete the voting period
      const { error } = await supabase.from('voting_periods').delete().eq('id', periodId);
      if (error) throw error;
      
      setPeriods(periods.filter(p => p.id !== periodId));
      toast.success('Voting history entry deleted');
    } catch (error: any) {
      console.error('Error deleting voting period:', error);
      toast.error('Failed to delete voting history');
    } finally {
      setDeleting(null);
    }
  };

  const filteredPeriods = periods.filter(period => {
    if (selectedCategory !== 'all' && period.category_id !== selectedCategory) {
      return false;
    }
    if (selectedYear !== 'all' && period.year !== parseInt(selectedYear)) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 sm:h-8 w-6 sm:w-8" />
          Voting History
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          View past voting periods and award winners
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="w-full sm:w-48">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color || '#f59e0b' }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-32">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {filteredPeriods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Published Results</h3>
            <p className="text-muted-foreground">
              There are no published voting results to display yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPeriods.map((period) => (
            <Card key={period.id} className="overflow-hidden">
              <div 
                className="h-2" 
                style={{ backgroundColor: period.category?.color || '#f59e0b' }}
              />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" style={{ color: period.category?.color || '#f59e0b' }} />
                      {period.category?.name || 'Award'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {months[period.month - 1]} {period.year}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {period.vote_count} vote{period.vote_count !== 1 ? 's' : ''}
                    </Badge>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Voting History</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this voting period and all associated votes. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(period.id)}
                              disabled={deleting === period.id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleting === period.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {period.winner ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-14 w-14 border-2" style={{ borderColor: period.category?.color || '#f59e0b' }}>
                          <AvatarImage src={period.winner.photo_url || undefined} />
                          <AvatarFallback>
                            {period.winner.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div 
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: period.category?.color || '#f59e0b' }}
                        >
                          <Trophy className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold">{period.winner.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {period.winner.position}
                          {period.winner.department && ` · ${period.winner.department}`}
                        </p>
                      </div>
                    </div>
                    {period.announcement_message && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm italic">"{period.announcement_message}"</p>
                      </div>
                    )}
                    {period.published_at && (
                      <p className="text-xs text-muted-foreground">
                        Announced on {format(new Date(period.published_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No winner selected</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
