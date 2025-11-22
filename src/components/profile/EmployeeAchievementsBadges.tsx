import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Calendar, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ShareAchievementDialog } from '@/components/achievements/ShareAchievementDialog';

interface Achievement {
  id: string;
  reason: string;
  awarded_date: string;
  achievement_types: {
    name: string;
    description: string;
    color: string;
    category: string;
    icon: string;
  };
}

interface EmployeeAchievementsBadgesProps {
  userId: string;
}

export const EmployeeAchievementsBadges = ({ userId }: EmployeeAchievementsBadgesProps) => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    fetchAchievements();
  }, [userId]);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_achievements')
        .select('id, reason, awarded_date, achievement_type_id')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('awarded_date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setAchievements([]);
        return;
      }

      const achievementTypeIds = Array.from(
        new Set(data.map((item: any) => item.achievement_type_id))
      );

      const { data: types, error: typesError } = await supabase
        .from('achievement_types')
        .select('id, name, description, color, category, icon')
        .in('id', achievementTypeIds);

      if (typesError) throw typesError;

      const typesMap = new Map((types || []).map((t: any) => [t.id, t]));

      const mapped: Achievement[] = (data as any[]).map((row) => ({
        id: row.id,
        reason: row.reason || '',
        awarded_date: row.awarded_date,
        achievement_types: typesMap.get(row.achievement_type_id) || {
          name: 'Unknown achievement',
          description: '',
          color: '#64748b',
          category: 'General',
          icon: 'award',
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

  const handleShareClick = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements & Awards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading achievements...</div>
        </CardContent>
      </Card>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements & Awards
          </CardTitle>
          <CardDescription>Recognition and accomplishments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No achievements awarded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements & Awards
          </CardTitle>
          <CardDescription>
            {achievements.length} {achievements.length === 1 ? 'achievement' : 'achievements'} earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="p-4 rounded-lg border transition-all hover:shadow-md"
                style={{ borderColor: `${achievement.achievement_types.color}40` }}
              >
                <div className="flex items-start gap-3">
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
                    <h3 className="font-semibold text-sm">{achievement.achievement_types.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {achievement.achievement_types.description}
                    </p>
                    {achievement.reason && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{achievement.reason}"
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {achievement.achievement_types.category}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(achievement.awarded_date), 'MMM yyyy')}
                        </div>
                      </div>
                      {isOwnProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShareClick(achievement)}
                          className="h-7 px-2 gap-1 hover:bg-primary/10"
                        >
                          <Share2 className="h-3 w-3" />
                          Share
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAchievement && (
        <ShareAchievementDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          achievement={{
            id: selectedAchievement.id,
            achievement_type: {
              name: selectedAchievement.achievement_types.name,
              description: selectedAchievement.achievement_types.description,
              color: selectedAchievement.achievement_types.color,
            },
            reason: selectedAchievement.reason,
            awarded_date: selectedAchievement.awarded_date,
          }}
        />
      )}
    </>
  );
};
