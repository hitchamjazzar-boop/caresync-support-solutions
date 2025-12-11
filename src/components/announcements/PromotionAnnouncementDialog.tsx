import { useState, useEffect, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, X, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState('');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('30');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEmployees.length === 0 || !newPosition) {
      toast({
        title: 'Error',
        description: 'Please select at least one employee and enter the new position',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const selectedEmployeeData = employees.filter(e => selectedEmployees.includes(e.id));
      if (selectedEmployeeData.length === 0) throw new Error('Employees not found');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        setUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `promotion-${Date.now()}.${fileExt}`;
        const filePath = `promotions/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
        setUploading(false);
      }

      // Calculate expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

      const names = selectedEmployeeData.map(e => e.full_name);
      const namesText = names.length === 1 
        ? names[0] 
        : names.length === 2 
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

      // Create promotion announcement - visible to promoted people
      const { error: announcementError } = await supabase
        .from('announcements')
        .insert({
          title: selectedEmployees.length === 1
            ? `🎉 Promotion: ${names[0]}`
            : `🎉 Promotions: Congratulations to Our Team!`,
          content: description || `Congratulations to ${namesText} on their promotion to ${newPosition}!`,
          created_by: user.id,
          featured_user_id: selectedEmployees[0],
          is_pinned: true,
          target_type: 'specific_users',
          target_users: selectedEmployees,
          expires_at: expiresAt.toISOString(),
          image_url: imageUrl,
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

      // Create achievement for each promoted employee
      for (const empId of selectedEmployees) {
        const { error: achievementError } = await supabase
          .from('employee_achievements')
          .insert({
            user_id: empId,
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
          .eq('id', empId);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: 'Promotion announcement created and achievements awarded!',
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
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployees([]);
    setNewPosition('');
    setDescription('');
    setExpiresInDays('30');
    setImageFile(null);
    setImagePreview(null);
  };

  const selectedEmployeeData = employees.filter(e => selectedEmployees.includes(e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Create Promotion Announcement
          </DialogTitle>
          <DialogDescription>
            Announce employee promotions and award them achievements
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Employee(s) ({selectedEmployees.length} selected)</Label>
            <div className="h-48 border rounded-md p-2 overflow-y-auto">
              {employees.map((employee) => (
                <label 
                  key={employee.id} 
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                >
                  <Checkbox 
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => toggleEmployee(employee.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={employee.photo_url || ''} />
                    <AvatarFallback>
                      {employee.full_name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Current: {employee.position || 'No position set'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {selectedEmployeeData.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Employees:</p>
              <div className="flex flex-wrap gap-2">
                {selectedEmployeeData.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 bg-background px-2 py-1 rounded-md">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={emp.photo_url || ''} />
                      <AvatarFallback>{emp.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{emp.full_name}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5"
                      onClick={() => toggleEmployee(emp.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
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
            <Label>Promotion Image (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-w-[600px] h-auto max-h-[600px] object-contain rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload an image (600x600 recommended)</span>
                </div>
              </Button>
            )}
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
            <Button type="submit" disabled={loading || uploading}>
              {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
