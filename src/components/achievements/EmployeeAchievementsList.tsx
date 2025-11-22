import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Award, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeAchievement {
  id: string;
  reason: string;
  awarded_date: string;
  created_at: string;
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

export const EmployeeAchievementsList = () => {
  const [achievements, setAchievements] = useState<EmployeeAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_achievements')
        .select(
          `
          id,
          reason,
          awarded_date,
          created_at,
          achievement_types (
            name,
            description,
            color,
            category
          ),
          profiles:user_id (
            full_name,
            position,
            photo_url
          ),
          awarded_by_profile:awarded_by (
            full_name
          )
        `
        )
        .order('awarded_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAchievements(data as any || []);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-3">
      {achievements.map((achievement) => (
        <Card key={achievement.id} className="p-4">
          <div className="flex items-start gap-4">
            <div
              className="p-3 rounded-lg shrink-0"
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
                  <h3 className="font-semibold text-lg">
                    {achievement.achievement_types.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={achievement.profiles.photo_url || ''} />
                        <AvatarFallback>
                          {achievement.profiles.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
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
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(achievement.awarded_date), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Awarded by {achievement.awarded_by_profile.full_name}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {achievement.achievement_types.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
