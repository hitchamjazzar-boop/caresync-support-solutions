import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Award, Calendar, User, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useAdmin } from '@/hooks/useAdmin';
import { cn } from '@/lib/utils';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface EmployeeAchievement {
  id: string;
  user_id: string;
  reason: string;
  awarded_date: string;
  created_at: string;
  is_visible: boolean;
  expires_at: string | null;
  achievement_types: {
    name: string;
    description: string;
    color: string;
    category: string;
  };
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  };
  awarded_by_profile: {
    full_name: string;
  };
}

type FilterType = 'all' | 'active' | 'inactive';

export const EmployeeAchievementsList = () => {
  const { isAdmin } = useAdmin();
  const [achievements, setAchievements] = useState<EmployeeAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [achievementToDelete, setAchievementToDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_achievements')
        .select('id, reason, awarded_date, created_at, achievement_type_id, user_id, awarded_by, is_visible, expires_at')
        .order('awarded_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setAchievements([]);
        return;
      }

      const achievementTypeIds = Array.from(
        new Set(data.map((item: any) => item.achievement_type_id))
      );
      const userIds = Array.from(new Set(data.map((item: any) => item.user_id)));
      const awardedByIds = Array.from(
        new Set(data.map((item: any) => item.awarded_by).filter(Boolean))
      );

      const [typesResult, profilesResult, awardedByProfilesResult] = await Promise.all([
        supabase
          .from('achievement_types')
          .select('id, name, description, color, category')
          .in('id', achievementTypeIds),
        supabase
          .from('profiles')
          .select('id, full_name, position, photo_url')
          .in('id', userIds),
        awardedByIds.length
          ? supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', awardedByIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (typesResult.error) throw typesResult.error;
      if (profilesResult.error) throw profilesResult.error;
      if (awardedByProfilesResult.error) throw awardedByProfilesResult.error;

      const typesMap = new Map(
        (typesResult.data || []).map((t: any) => [t.id, t])
      );
      const profilesMap = new Map(
        (profilesResult.data || []).map((p: any) => [p.id, p])
      );
      const awardedByMap = new Map(
        (awardedByProfilesResult.data || []).map((p: any) => [p.id, p])
      );

      const mapped: EmployeeAchievement[] = (data as any[]).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        reason: row.reason || '',
        awarded_date: row.awarded_date,
        created_at: row.created_at,
        is_visible: row.is_visible,
        expires_at: row.expires_at,
        achievement_types: typesMap.get(row.achievement_type_id) || {
          name: 'Unknown achievement',
          description: '',
          color: '#64748b',
          category: 'General',
        },
        profiles: profilesMap.get(row.user_id) || {
          full_name: 'Unknown User',
          position: '',
          photo_url: null,
        },
        awarded_by_profile: awardedByMap.get(row.awarded_by) || {
          full_name: 'Unknown',
        },
      }));

      setAchievements(mapped);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (achievementId: string) => {
    setAchievementToDelete(achievementId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!achievementToDelete) return;

    try {
      const { error } = await supabase
        .from('employee_achievements')
        .delete()
        .eq('id', achievementToDelete);

      if (error) throw error;

      toast.success('Achievement deleted successfully');
      fetchAchievements();
    } catch (error: any) {
      console.error('Error deleting achievement:', error);
      toast.error('Failed to delete achievement');
    } finally {
      setDeleteDialogOpen(false);
      setAchievementToDelete(null);
    }
  };

  const toggleVisibility = async (achievementId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_achievements')
        .update({ is_visible: !currentVisibility })
        .eq('id', achievementId);

      if (error) throw error;

      toast.success(currentVisibility ? 'Badge deactivated' : 'Badge activated');
      fetchAchievements();
    } catch (error: any) {
      console.error('Error updating achievement:', error);
      toast.error('Failed to update achievement');
    }
  };

  const isAchievementActive = (achievement: EmployeeAchievement): boolean => {
    if (!achievement.is_visible) return false;
    if (achievement.expires_at && isPast(new Date(achievement.expires_at))) return false;
    return true;
  };

  const filteredAchievements = achievements.filter((achievement) => {
    if (filter === 'all') return true;
    const isActive = isAchievementActive(achievement);
    return filter === 'active' ? isActive : !isActive;
  });

  if (loading) {
    return <div className="text-center py-8">Loading achievements...</div>;
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No achievements have been awarded yet.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Showing {filteredAchievements.length} of {achievements.length} achievements
        </div>
        <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredAchievements.map((achievement) => {
          const isActive = isAchievementActive(achievement);
          const isExpired = achievement.expires_at && isPast(new Date(achievement.expires_at));

          return (
            <Card
              key={achievement.id}
              className={cn('p-4', !isActive && 'opacity-60 bg-muted/50')}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn('p-3 rounded-lg shrink-0', !isActive && 'grayscale')}
                  style={{ backgroundColor: `${achievement.achievement_types.color}20` }}
                >
                  <Award
                    className="h-6 w-6"
                    style={{ color: achievement.achievement_types.color }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {achievement.achievement_types.name}
                        </h3>
                        {isActive ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                            <XCircle className="h-3 w-3 mr-1" />
                            {isExpired ? 'Expired' : 'Inactive'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <ProfileAvatarWithBadges
                            userId={achievement.user_id}
                            photoUrl={achievement.profiles.photo_url}
                            fullName={achievement.profiles.full_name}
                            className="h-8 w-8"
                          />
                          <div>
                            <div className="font-medium text-sm">
                              {achievement.profiles.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {achievement.profiles.position}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3">
                        {achievement.reason}
                      </p>
                      <div className="flex items-center flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(achievement.awarded_date), 'MMM d, yyyy')}
                        </div>
                        {achievement.expires_at && (
                          <div className={cn('flex items-center gap-1', isExpired && 'text-destructive')}>
                            <Clock className="h-3 w-3" />
                            {isExpired ? 'Expired' : 'Expires'}: {format(new Date(achievement.expires_at), 'MMM d, yyyy')}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Awarded by {achievement.awarded_by_profile.full_name}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {achievement.achievement_types.category}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isActive ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => toggleVisibility(achievement.id, achievement.is_visible)}
                        >
                          {achievement.is_visible ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(achievement.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Achievement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this achievement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
