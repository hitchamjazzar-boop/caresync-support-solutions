import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  target_type: string;
  target_users: string[] | null;
  target_roles: string[] | null;
  target_departments: string[] | null;
}

export function useAnnouncementVisibility() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    fetchUserInfo();
  }, [user]);

  const fetchUserInfo = async () => {
    if (!user) return;

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (roleData) {
      setUserRole(roleData.role);
    }

    // Get user department
    const { data: profileData } = await supabase
      .from('profiles')
      .select('department')
      .eq('id', user.id)
      .single();

    if (profileData) {
      setUserDepartment(profileData.department);
    }
  };

  const canSeeAnnouncement = (announcement: Announcement): boolean => {
    if (!user) return false;

    // Everyone can see announcements targeted to 'all'
    if (announcement.target_type === 'all') {
      return true;
    }

    // Check specific users
    if (announcement.target_type === 'specific_users') {
      return announcement.target_users?.includes(user.id) || false;
    }

    // Check roles
    if (announcement.target_type === 'roles') {
      return announcement.target_roles?.includes(userRole || '') || false;
    }

    // Check departments
    if (announcement.target_type === 'departments') {
      return announcement.target_departments?.includes(userDepartment || '') || false;
    }

    return false;
  };

  return { canSeeAnnouncement };
}
