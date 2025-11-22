import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
}

interface PromotionAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PromotionAnnouncementDialog({ open, onOpenChange, onSuccess }: PromotionAnnouncementDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [newPosition, setNewPosition] = useState('');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');

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
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee || !newPosition) {
      toast({
        title: 'Error',
        description: 'Please select an employee and enter their new position',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const employee = employees.find((e) => e.id === selectedEmployee);
      if (!employee) throw new Error('Employee not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      // Create promotion announcement
      const { error: announcementError } = await supabase
        .from('announcements')
        .insert({
          title: `🎉 Promotion: ${employee.full_name}`,
          content: description || `Congratulations to ${employee.full_name} on their promotion to ${newPosition}!`,
          created_by: user.id,
          featured_user_id: selectedEmployee,
          is_pinned: true,
          target_type: 'all',
          expires_at: expiresAt.toISOString(),
        });

      if (announcementError) throw announcementError;

      // Find or create a "Promotion" achievement type
      let promotionTypeId: string;
      const { data: existingType } = await supabase
        .from('achievement_types')
        .select('id')
        .eq('name', 'Promotion')
        .single();

      if (existingType) {
        promotionTypeId = existingType.id;
      } else {
        const { data: newType, error: typeError } = await supabase
          .from('achievement_types')
          .insert({
            name: 'Promotion',
            description: 'Awarded for career advancement and promotion',
            icon: 'TrendingUp',
            color: '#3b82f6',
            category: 'Career',
            points: 50,
          })
          .select('id')
          .single();

        if (typeError) throw typeError;
        promotionTypeId = newType.id;
      }

      // Create achievement for the promoted employee
      const { error: achievementError } = await supabase
        .from('employee_achievements')
        .insert({
          user_id: selectedEmployee,
          achievement_type_id: promotionTypeId,
          awarded_by: user.id,
          reason: `Promoted to ${newPosition}`,
          notes: description,
        });

      if (achievementError) throw achievementError;

      // Update employee's position in profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ position: newPosition })
        .eq('id', selectedEmployee);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Promotion announcement created and achievement awarded!',
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee('');
    setNewPosition('');
    setDescription('');
    setExpiresInDays('30');
  };

  const selectedEmployeeData = employees.find((e) => e.id === selectedEmployee);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Create Promotion Announcement
          </DialogTitle>
          <DialogDescription>
            Announce an employee promotion and award them an achievement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Select Employee</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={employee.photo_url || ''} />
                        <AvatarFallback>
                          {employee.full_name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{employee.full_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeData && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedEmployeeData.photo_url || ''} />
                  <AvatarFallback>
                    {selectedEmployeeData.full_name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedEmployeeData.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current: {selectedEmployeeData.position || 'No position set'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPosition">New Position</Label>
            <Input
              id="newPosition"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              placeholder="e.g., Senior Developer, Team Lead"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the promotion..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresInDays">Pin for (days)</Label>
            <Input
              id="expiresInDays"
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              min="1"
              max="365"
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
              Create Announcement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
