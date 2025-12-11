import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Employee {
  id: string;
  full_name: string;
  position: string;
  photo_url: string | null;
}

interface NominationFormProps {
  votingPeriodId: string;
  hasNominated: boolean;
  onNominated: () => void;
}

export const NominationForm = ({ votingPeriodId, hasNominated, onNominated }: NominationFormProps) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .neq('id', user?.id)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !comment.trim()) {
      toast.error('Please select an employee and provide a comment');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_nominations')
        .insert({
          voting_period_id: votingPeriodId,
          nominated_user_id: selectedEmployee,
          nominator_user_id: user?.id,
          comment: comment.trim()
        });

      if (error) throw error;

      toast.success('Nomination submitted successfully!');
      setSelectedEmployee('');
      setComment('');
      onNominated();
    } catch (error: any) {
      console.error('Error submitting nomination:', error);
      if (error.message.includes('duplicate')) {
        toast.error('You have already nominated this person');
      } else {
        toast.error('Failed to submit nomination');
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasNominated) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-muted-foreground">
          Thank you! You have already submitted a nomination for this period.
        </p>
        <p className="text-sm text-muted-foreground">
          You can nominate multiple colleagues if you'd like.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="employee">Select Employee to Nominate</Label>
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                <div className="flex items-center gap-2">
                  <ProfileAvatarWithBadges
                    userId={employee.id}
                    photoUrl={employee.photo_url}
                    fullName={employee.full_name}
                    className="h-6 w-6"
                    showBadges={false}
                  />
                  <div>
                    <div className="font-medium">{employee.full_name}</div>
                    <div className="text-xs text-muted-foreground">{employee.position}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Why do you nominate this person? (Private)</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share why this colleague deserves to be Employee of the Month..."
          className="min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          Your comment is private and will only be visible to administrators.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Nomination
      </Button>
    </form>
  );
};
