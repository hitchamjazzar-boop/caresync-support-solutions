import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, ShieldCheck, Settings, Trash2 } from 'lucide-react';
import { AdminPermissionsDialog } from '@/components/employees/AdminPermissionsDialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminUser {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
  is_full_admin: boolean;
  permissions: string[];
}

const PERMISSION_LABELS: Record<string, string> = {
  employees: 'Employees',
  attendance: 'Attendance',
  payroll: 'Payroll',
  announcements: 'Announcements',
  shoutouts: 'Shout Outs',
  feedback: 'Feedback',
  memos: 'Memos',
  achievements: 'Achievements',
  voting: 'Voting',
  schedules: 'Schedules',
  calendar: 'Calendar Settings',
};

export default function AdminManagement() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<AdminUser | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }
    if (!adminLoading && isAdmin) {
      fetchAdminUsers();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchAdminUsers = async () => {
    setLoading(true);
    
    // Get all users with admin role
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    // Get all users with specific permissions
    const { data: permissions } = await supabase
      .from('admin_permissions')
      .select('user_id, permission_type');

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);
    const permissionUserIds = new Set(permissions?.map(p => p.user_id) || []);
    const allAdminUserIds = [...new Set([...adminUserIds, ...permissionUserIds])];

    if (allAdminUserIds.length === 0) {
      setAdminUsers([]);
      setLoading(false);
      return;
    }

    // Get profiles for all admin users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url, position, department')
      .in('id', allAdminUserIds);

    const adminUsersData: AdminUser[] = (profiles || []).map(profile => {
      const isFullAdmin = adminUserIds.has(profile.id);
      const userPermissions = permissions
        ?.filter(p => p.user_id === profile.id)
        .map(p => p.permission_type) || [];

      return {
        id: profile.id,
        full_name: profile.full_name,
        photo_url: profile.photo_url,
        position: profile.position,
        department: profile.department,
        is_full_admin: isFullAdmin,
        permissions: userPermissions,
      };
    });

    // Sort: full admins first, then by name
    adminUsersData.sort((a, b) => {
      if (a.is_full_admin && !b.is_full_admin) return -1;
      if (!a.is_full_admin && b.is_full_admin) return 1;
      return a.full_name.localeCompare(b.full_name);
    });

    setAdminUsers(adminUsersData);
    setLoading(false);
  };

  const handleRevokeAccess = async () => {
    if (!userToRevoke) return;

    try {
      // Remove admin role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToRevoke.id)
        .eq('role', 'admin');

      // Remove all permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', userToRevoke.id);

      toast({
        title: 'Access Revoked',
        description: `Admin access has been revoked from ${userToRevoke.full_name}.`,
      });

      fetchAdminUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke admin access.',
        variant: 'destructive',
      });
    } finally {
      setRevokeDialogOpen(false);
      setUserToRevoke(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const fullAdmins = adminUsers.filter(u => u.is_full_admin);
  const limitedAdmins = adminUsers.filter(u => !u.is_full_admin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Management</h1>
        <p className="text-muted-foreground">View and manage users with admin access</p>
      </div>

      {/* Full Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Full Admins
          </CardTitle>
          <CardDescription>
            Users with complete admin access to all features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fullAdmins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No full admins found</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {fullAdmins.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photo_url || undefined} />
                    <AvatarFallback>
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.position || user.department || 'Employee'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedEmployee({ id: user.id, name: user.full_name });
                        setPermissionsDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setUserToRevoke(user);
                        setRevokeDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limited Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Limited Admins
          </CardTitle>
          <CardDescription>
            Users with access to specific admin features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limitedAdmins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No limited admins found</p>
          ) : (
            <div className="grid gap-4">
              {limitedAdmins.map(user => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.photo_url || undefined} />
                      <AvatarFallback>
                        {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.position || user.department || 'Employee'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {user.permissions.map(perm => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {PERMISSION_LABELS[perm] || perm}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedEmployee({ id: user.id, name: user.full_name });
                        setPermissionsDialogOpen(true);
                      }}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setUserToRevoke(user);
                        setRevokeDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        To grant admin access to a new user, go to the Employees page and click "Admin Permissions" on their card.
      </p>

      {selectedEmployee && (
        <AdminPermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={(open) => {
            setPermissionsDialogOpen(open);
            if (!open) {
              setSelectedEmployee(null);
              fetchAdminUsers();
            }
          }}
          employee={selectedEmployee ? { id: selectedEmployee.id, full_name: selectedEmployee.name } : null}
          onSuccess={fetchAdminUsers}
        />
      )}

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke all admin access from {userToRevoke?.full_name}? 
              This will remove both full admin role and any specific permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} className="bg-destructive text-destructive-foreground">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
