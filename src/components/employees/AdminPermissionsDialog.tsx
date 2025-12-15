import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';

interface AdminPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    full_name: string;
  } | null;
  onSuccess?: () => void;
}

const PERMISSION_TYPES = [
  { key: 'employees', label: 'Employees', description: 'View and manage employee profiles' },
  { key: 'attendance', label: 'Attendance', description: 'View and manage attendance records' },
  { key: 'payroll', label: 'Payroll', description: 'View and manage payroll' },
  { key: 'reports', label: 'Reports', description: 'View EOD reports and analytics' },
  { key: 'announcements', label: 'Announcements', description: 'Create and manage announcements' },
  { key: 'memos', label: 'Memos', description: 'Send and manage memos' },
  { key: 'schedules', label: 'Schedules', description: 'Manage employee schedules' },
  { key: 'feedback', label: 'Feedback', description: 'View employee feedback' },
  { key: 'shoutouts', label: 'Shout Outs', description: 'Manage shout outs' },
  { key: 'achievements', label: 'Achievements', description: 'Award achievements to employees' },
  { key: 'voting', label: 'Voting', description: 'Manage employee voting' },
  { key: 'calendar', label: 'Calendar', description: 'Manage calendar events' },
];

export function AdminPermissionsDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: AdminPermissionsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isFullAdmin, setIsFullAdmin] = useState(false);

  useEffect(() => {
    if (open && employee) {
      fetchCurrentPermissions();
    }
  }, [open, employee]);

  const fetchCurrentPermissions = async () => {
    if (!employee) return;
    setLoading(true);

    try {
      // Check if user is full admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', employee.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsFullAdmin(!!roleData);

      // Get current permissions
      const { data: permData, error } = await supabase
        .from('admin_permissions')
        .select('permission_type')
        .eq('user_id', employee.id);

      if (error) throw error;

      setPermissions(new Set(permData?.map(p => p.permission_type) || []));
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: string) => {
    const newPermissions = new Set(permissions);
    if (newPermissions.has(permission)) {
      newPermissions.delete(permission);
    } else {
      newPermissions.add(permission);
    }
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    if (!employee || !user) return;
    setSaving(true);

    try {
      // Delete all existing permissions for this user
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', employee.id);

      // Insert new permissions
      if (permissions.size > 0) {
        const permissionsToInsert = Array.from(permissions).map(perm => ({
          user_id: employee.id,
          permission_type: perm,
          granted_by: user.id,
        }));

        const { error } = await supabase
          .from('admin_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast({
        title: 'Permissions updated',
        description: `Admin permissions for ${employee.full_name} have been updated.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMakeFullAdmin = async () => {
    if (!employee || !user) return;
    setSaving(true);

    try {
      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: employee.id,
          role: 'admin',
        }, { onConflict: 'user_id,role' });

      if (error) throw error;

      // Clear granular permissions since they're now a full admin
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', employee.id);

      toast({
        title: 'Admin access granted',
        description: `${employee.full_name} now has full admin access.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!employee) return;
    setSaving(true);

    try {
      // Remove admin role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', employee.id)
        .eq('role', 'admin');

      // Clear granular permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', employee.id);

      setIsFullAdmin(false);
      setPermissions(new Set());

      toast({
        title: 'Admin access removed',
        description: `${employee.full_name} no longer has admin access.`,
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Permissions
          </DialogTitle>
          <DialogDescription>
            {employee ? `Manage admin access for ${employee.full_name}` : 'Select an employee'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isFullAdmin ? (
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">Full Admin Access</p>
              <p className="text-sm text-muted-foreground mt-1">
                This user has full admin access to all features.
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleRemoveAdmin}
              disabled={saving}
              className="w-full"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Admin Access
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Permissions</Label>
              <div className="grid gap-2">
                {PERMISSION_TYPES.map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.has(perm.key)}
                      onChange={() => togglePermission(perm.key)}
                      className="h-4 w-4 mt-0.5 rounded border-input"
                    />
                    <div className="flex-1">
                      <span className="font-medium">
                        {perm.label}
                      </span>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Permissions
              </Button>
              <Button 
                variant="outline" 
                onClick={handleMakeFullAdmin}
                disabled={saving}
              >
                Grant Full Admin Access
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}