import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AdminPermission = 
  | 'employees' 
  | 'attendance' 
  | 'payroll' 
  | 'announcements' 
  | 'shoutouts' 
  | 'feedback' 
  | 'memos' 
  | 'achievements' 
  | 'voting' 
  | 'schedules' 
  | 'calendar';

export const useAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      // Check if user has full admin role
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      const hasFullAdmin = !!adminRole;
      setIsAdmin(hasFullAdmin);

      // Get specific permissions
      const { data: perms } = await supabase
        .from('admin_permissions')
        .select('permission_type')
        .eq('user_id', user.id);

      const userPermissions = perms?.map(p => p.permission_type as AdminPermission) || [];
      setPermissions(userPermissions);
      setLoading(false);
    };

    checkAdminStatus();
  }, [user]);

  // Check if user has a specific permission (full admin or specific permission)
  const hasPermission = useCallback((permission: AdminPermission): boolean => {
    if (isAdmin) return true; // Full admins have all permissions
    return permissions.includes(permission);
  }, [isAdmin, permissions]);

  // Check if user has any admin access (full or limited)
  const hasAnyAdminAccess = useCallback((): boolean => {
    return isAdmin || permissions.length > 0;
  }, [isAdmin, permissions]);

  return { 
    isAdmin, 
    permissions, 
    loading, 
    hasPermission,
    hasAnyAdminAccess,
  };
};
