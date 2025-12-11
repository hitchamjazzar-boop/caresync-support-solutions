import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Loader2, CalendarIcon, Award } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AchievementType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

interface Employee {
  id: string;
  full_name: string;
  position: string;
  photo_url: string | null;
}

interface AwardAchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementTypes: AchievementType[];
  onSuccess: () => void;
}

export const AwardAchievementDialog = ({
  open,
  onOpenChange,
  achievementTypes,
  onSuccess,
}: AwardAchievementDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [reason, setReason] = useState('');
  const [awardedDate, setAwardedDate] = useState<Date>(new Date());
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
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
    if (!selectedType || !selectedEmployee || !reason.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_achievements')
        .insert({
          achievement_type_id: selectedType,
          user_id: selectedEmployee,
          awarded_by: user?.id,
          reason: reason.trim(),
          awarded_date: format(awardedDate, 'yyyy-MM-dd'),
          is_visible: true,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
        });

      if (error) throw error;

      setSelectedType('');
      setSelectedEmployee('');
      setReason('');
      setAwardedDate(new Date());
      setExpiresAt(undefined);
      onSuccess();
    } catch (error: any) {
      console.error('Error awarding achievement:', error);
      toast.error('Failed to award achievement');
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeData = achievementTypes.find((type) => type.id === selectedType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Award Achievement</DialogTitle>
          <DialogDescription>
            Recognize an employee with a custom badge or award
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="achievement-type">Achievement Type *</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select an achievement type" />
              </SelectTrigger>
              <SelectContent>
                {achievementTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" style={{ color: type.color }} />
                      <span>{type.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {type.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTypeData && (
              <p className="text-sm text-muted-foreground">
                {selectedTypeData.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
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
                        <div className="text-xs text-muted-foreground">
                          {employee.position}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Award Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !awardedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {awardedDate ? format(awardedDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={awardedDate}
                  onSelect={(date) => date && setAwardedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !expiresAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, 'PPP') : <span>No expiration</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={setExpiresAt}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {expiresAt && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpiresAt(undefined)}
                className="text-xs"
              >
                Clear expiration
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Award *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this employee deserves this achievement..."
              className="min-h-[100px]"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Award Achievement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
