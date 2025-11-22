import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Lock, Unlock } from 'lucide-react';

interface VotingPeriod {
  id: string;
  month: number;
  year: number;
  status: string;
}

interface VotingPeriodManagerProps {
  currentPeriod: VotingPeriod | null;
  onPeriodChange: () => void;
}

export const VotingPeriodManager = ({ currentPeriod, onPeriodChange }: VotingPeriodManagerProps) => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleCreatePeriod = async () => {
    setLoading(true);
    try {
      // Close any existing open periods
      await supabase
        .from('voting_periods')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('status', 'open');

      // Create new period
      const { error } = await supabase
        .from('voting_periods')
        .insert({ month, year, status: 'open' });

      if (error) throw error;

      toast.success('New voting period created!');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Manage Voting Period (Admin)
        </CardTitle>
        <CardDescription>Create or close voting periods for Employee of the Month</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPeriod ? (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="font-medium">
                Current Period: {months[currentPeriod.month - 1]} {currentPeriod.year}
              </div>
              <div className="text-sm text-muted-foreground">
                Status: {currentPeriod.status}
              </div>
            </div>
            <Button 
              onClick={handleClosePeriod} 
              disabled={loading || currentPeriod.status === 'closed'}
              variant="destructive"
            >
              <Lock className="mr-2 h-4 w-4" />
              Close Period
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
            <Button onClick={handleCreatePeriod} disabled={loading} className="w-full">
              <Unlock className="mr-2 h-4 w-4" />
              Create New Voting Period
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
