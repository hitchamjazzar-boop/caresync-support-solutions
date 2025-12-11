import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Lock, Unlock, Loader2 } from 'lucide-react';

interface VotingPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
  category_id: string | null;
  is_published: boolean;
}

interface AwardCategory {
  id: string;
  name: string;
  color: string;
  is_active: boolean;
}

interface VotingPeriodManagerProps {
  currentPeriod: VotingPeriod | null;
  onPeriodChange: () => void;
}

export const VotingPeriodManager = ({ currentPeriod, onPeriodChange }: VotingPeriodManagerProps) => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('award_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      
      // Set default category if available
      if (data && data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreatePeriod = async () => {
    if (!categoryId) {
      toast.error('Please select an award category');
      return;
    }

    setLoading(true);
    try {
      // Close any existing open periods for this category
      await supabase
        .from('voting_periods')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('status', 'open')
        .eq('category_id', categoryId);

      // Create new period
      const { error } = await supabase
        .from('voting_periods')
        .insert({ 
          month, 
          year, 
          status: 'open',
          category_id: categoryId,
        });

      if (error) throw error;

      // Get the category name for the announcement
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category?.name || 'Award';

      // Get current user for the announcement
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Create an announcement to notify users that voting is open
        await supabase
          .from('announcements')
          .insert({
            title: `🗳️ Voting Now Open: ${categoryName}`,
            content: `Voting for ${months[month - 1]} ${year} ${categoryName} is now open! Cast your vote for the most deserving colleague. Head to the Voting page to nominate and vote for your favorite candidates.`,
            created_by: user.id,
            is_active: true,
            target_type: 'all',
          });
      }

      toast.success('New voting period created! Users have been notified.');
      onPeriodChange();
    } catch (error: any) {
      console.error('Error creating period:', error);
      if (error.message.includes('duplicate')) {
        toast.error('A voting period for this month already exists');
      } else {
        toast.error('Failed to create voting period');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClosePeriod = async () => {
    if (!currentPeriod) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('voting_periods')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', currentPeriod.id);

      if (error) throw error;

      toast.success('Voting period closed!');
      onPeriodChange();
    } catch (error: any) {
      console.error('Error closing period:', error);
      toast.error('Failed to close voting period');
    } finally {
      setLoading(false);
    }
  };

  const currentCategory = categories.find(c => c.id === currentPeriod?.category_id);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Manage Voting Period
        </CardTitle>
        <CardDescription>Create or close voting periods for awards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPeriod ? (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium flex items-center gap-2">
                Current Period: {months[currentPeriod.month - 1]} {currentPeriod.year}
                {currentCategory && (
                  <span 
                    className="px-2 py-0.5 rounded text-xs text-white"
                    style={{ backgroundColor: currentCategory.color }}
                  >
                    {currentCategory.name}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                Status: {currentPeriod.status}
                {currentPeriod.is_published && ' (Published)'}
              </div>
            </div>
            <Button 
              onClick={handleClosePeriod} 
              disabled={loading || currentPeriod.status === 'closed'}
              variant="destructive"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Close Period
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Award Category</Label>
              {loadingCategories ? (
                <div className="text-sm text-muted-foreground">Loading categories...</div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No active categories. Create one first.
                </div>
              ) : (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[year - 1, year, year + 1].map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleCreatePeriod} 
              disabled={loading || !categoryId} 
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              Create New Voting Period
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};