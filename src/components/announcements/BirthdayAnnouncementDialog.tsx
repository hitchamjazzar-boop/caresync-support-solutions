import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
  birthday: string | null;
}

interface BirthdayAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BirthdayAnnouncementDialog({ open, onOpenChange, onSuccess }: BirthdayAnnouncementDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, position, photo_url, birthday')
      .not('birthday', 'is', null)
      .order('full_name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load employees',
        variant: 'destructive',
      });
      return;
    }

    setEmployees(data || []);
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

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 2MB',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee) {
      toast({
        title: 'Missing Information',
        description: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      // Upload image if provided
      if (imageFile) {
        setUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `birthday-${Date.now()}.${fileExt}`;
        const filePath = `birthdays/${fileName}`;

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

      // Get employee name and birthday
      const employee = employees.find(e => e.id === selectedEmployee);
      if (!employee) throw new Error('Employee not found');

      const title = `🎂 Happy Birthday ${employee.full_name}!`;
      const defaultMessage = message.trim() || `Wishing ${employee.full_name.split(' ')[0]} a wonderful birthday filled with joy and happiness! 🎉`;

      // Create announcement
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('announcements')
        .insert({
          title,
          content: defaultMessage,
          created_by: userData.user?.id,
          target_type: 'all',
          is_pinned: true,
          image_url: imageUrl || null,
          featured_user_id: selectedEmployee,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Birthday announcement created',
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
    setSelectedEmployee('');
    setMessage('');
    setImageFile(null);
    setImagePreview('');
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Birthday Announcement</DialogTitle>
          <DialogDescription>
            Select an employee and add a special birthday message
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Select Employee *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={employee.photo_url || undefined} />
                        <AvatarFallback>{employee.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>
                        {employee.full_name} 
                        {employee.birthday && ` - ${format(new Date(employee.birthday), 'MMM dd')}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployeeData && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedEmployeeData.photo_url || undefined} />
                <AvatarFallback className="text-lg">{selectedEmployeeData.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedEmployeeData.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedEmployeeData.position || 'N/A'}</p>
                {selectedEmployeeData.birthday && (
                  <p className="text-xs text-muted-foreground">
                    Birthday: {format(new Date(selectedEmployeeData.birthday), 'MMMM dd')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Birthday Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a special birthday message... (leave empty for default message)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Birthday Image (Optional)</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Label htmlFor="image" className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-8 text-sm hover:bg-accent hover:text-accent-foreground">
                  <Upload className="h-4 w-4" />
                  Upload Birthday Image
                </div>
              </Label>
            )}
            <Input
              id="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG or WEBP. Max 2MB.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? 'Uploading...' : 'Creating...'}
                </>
              ) : (
                'Create Announcement'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
