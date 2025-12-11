import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, X, Image } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
}

interface EmployeeOfMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EmployeeOfMonthDialog({ open, onOpenChange, onSuccess }: EmployeeOfMonthDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, position, photo_url')
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

    if (selectedEmployees.length === 0 || !description) {
      toast({
        title: 'Missing Information',
        description: 'Please select at least one employee and add a description',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        setUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `eom-${Date.now()}.${fileExt}`;
        const filePath = `employee-of-month/${fileName}`;

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

      const selectedEmployeeData = employees.filter(e => selectedEmployees.includes(e.id));
      const names = selectedEmployeeData.map(e => e.full_name);
      const namesText = names.length === 1 
        ? names[0] 
        : names.length === 2 
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;

      const title = selectedEmployees.length === 1
        ? `Employee of the Month: ${names[0]}`
        : `Employees of the Month: ${namesText}`;

      // Create announcement
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('announcements')
        .insert({
          title,
          content: description,
          created_by: userData.user?.id,
          target_type: 'all',
          is_pinned: true,
          image_url: imageUrl,
          featured_user_id: selectedEmployees[0],
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Employee of the Month announcement created',
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
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
  };

  const selectedEmployeeData = employees.filter(e => selectedEmployees.includes(e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Employee of the Month</DialogTitle>
          <DialogDescription>
            Select employees and add a description to create the announcement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Employee(s) ({selectedEmployees.length} selected)</Label>
            <ScrollArea className="h-48 border rounded-md p-2">
              {employees.map((employee) => (
                <div 
                  key={employee.id} 
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => toggleEmployee(employee.id)}
                >
                  <Checkbox 
                    checked={selectedEmployees.includes(employee.id)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleEmployee(employee.id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={employee.photo_url || ''} />
                    <AvatarFallback>{employee.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{employee.full_name}</p>
                    <p className="text-xs text-muted-foreground">{employee.position || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {selectedEmployeeData.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Employees:</p>
              <div className="flex flex-wrap gap-2">
                {selectedEmployeeData.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 bg-background px-2 py-1 rounded-md">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={emp.photo_url || ''} />
                      <AvatarFallback>{emp.full_name.charAt(0)}</AvatarFallback>
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
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write why these employees deserve to be Employee of the Month..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Featured Image (Optional)</Label>
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
                  <Image className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload an image (600x600 recommended)</span>
                </div>
              </Button>
            )}
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
