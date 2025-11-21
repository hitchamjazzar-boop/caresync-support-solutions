import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const AddEmployeeDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    position: '',
    department: '',
    contactPhone: '',
    employmentType: 'hourly' as 'hourly' | 'salaried',
    hourlyRate: '',
    monthlySalary: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData({ ...formData, password: newPassword });
    toast({
      title: 'Password Generated',
      description: 'A secure password has been generated. You can modify it if needed.',
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.password) {
        toast({
          title: 'Password Required',
          description: 'Please enter a password or generate one.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Not authenticated');
      }

      // Upload photo if provided
      let photoUrl = null;
      if (photoFile) {
        // Generate a temporary unique filename
        const tempId = crypto.randomUUID();
        const fileExt = photoFile.name.split('.').pop();
        const filePath = `temp-${tempId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(filePath);

        photoUrl = urlData.publicUrl;
      }

      // Call edge function to create employee
      const { data, error: createError } = await supabase.functions.invoke('create-employee', {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          position: formData.position,
          department: formData.department,
          contactPhone: formData.contactPhone,
          startDate: formData.startDate,
          employmentType: formData.employmentType,
          hourlyRate: formData.employmentType === 'hourly' ? parseFloat(formData.hourlyRate) : null,
          monthlySalary: formData.employmentType === 'salaried' ? parseFloat(formData.monthlySalary) : null,
          photoUrl: photoUrl,
          adminId: user.user.id,
        },
      });

      if (createError) throw createError;

      toast({
        title: 'Employee Added Successfully',
        description: `${formData.fullName} has been added and will receive a welcome email.`,
      });

      setOpen(false);
      onSuccess();
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        position: '',
        department: '',
        contactPhone: '',
        employmentType: 'hourly',
        hourlyRate: '',
        monthlySalary: '',
        startDate: new Date().toISOString().split('T')[0],
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error: any) {
      console.error('Error adding employee:', error);
      toast({
        title: 'Error adding employee',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-20 w-20 rounded-full object-cover"
                />
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                required
                placeholder="Enter password or generate one"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This password will be sent to the employee via email. They can change it after their first login.
            </p>
          </div>

          {/* Position & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
          </div>

          {/* Compensation */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type *</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value: 'hourly' | 'salaried') =>
                  setFormData({ ...formData, employmentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salaried">Salaried</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.employmentType === 'hourly' ? (
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate *</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  required
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="monthlySalary">Monthly Salary *</Label>
                <Input
                  id="monthlySalary"
                  type="number"
                  step="0.01"
                  required
                  value={formData.monthlySalary}
                  onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Employee...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
