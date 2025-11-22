import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Award, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerBirthdayConfetti } from '@/lib/confetti';

interface ProfileAvatarWithBadgesProps {
  userId: string;
  photoUrl?: string | null;
  fullName: string;
  className?: string;
  showBadges?: boolean;
}

interface UserStatus {
  hasAchievements: boolean;
  isBirthday: boolean;
  latestAchievementColor?: string;
}

export const ProfileAvatarWithBadges = ({
  userId,
  photoUrl,
  fullName,
  className,
  showBadges = true,
}: ProfileAvatarWithBadgesProps) => {
  const [status, setStatus] = useState<UserStatus>({
    hasAchievements: false,
    isBirthday: false,
    latestAchievementColor: undefined,
  });

  useEffect(() => {
    if (showBadges) {
      checkUserStatus();
      
      // Set up real-time listener for profile changes
      const channel = supabase
        .channel(`profile-status-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          () => {
            checkUserStatus();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'employee_achievements',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            checkUserStatus();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, showBadges]);

  const checkUserStatus = async () => {
    try {
      // Check for most recent achievement
      const { data: achievements } = await supabase
        .from('employee_achievements')
        .select('id, achievement_type_id, awarded_date')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('awarded_date', { ascending: false })
        .limit(1);

      let latestAchievementColor: string | undefined;

      if (achievements && achievements.length > 0) {
        // Fetch the achievement type to get the color
        const { data: achievementType } = await supabase
          .from('achievement_types')
          .select('color')
          .eq('id', achievements[0].achievement_type_id)
          .single();

        latestAchievementColor = achievementType?.color;
      }

      // Check for birthday
      const { data: profile } = await supabase
        .from('profiles')
        .select('birthday')
        .eq('id', userId)
        .single();

      const isBirthday = profile?.birthday
        ? isBirthdayToday(profile.birthday)
        : false;

      setStatus({
        hasAchievements: (achievements?.length || 0) > 0,
        isBirthday,
        latestAchievementColor,
      });
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const isBirthdayToday = (birthday: string): boolean => {
    const today = new Date();
    const birthdayDate = new Date(birthday);
    return (
      today.getMonth() === birthdayDate.getMonth() &&
      today.getDate() === birthdayDate.getDate()
    );
  };

  const getFrameStyles = () => {
    // Birthday takes priority over achievements
    if (status.isBirthday) {
      return 'ring-4 ring-pink-500 ring-offset-2 ring-offset-background';
    }
    if (status.hasAchievements && status.latestAchievementColor) {
      return `ring-4 ring-offset-2 ring-offset-background`;
    }
    return '';
  };

  return (
    <div className="relative inline-block">
      <Avatar 
        className={cn(getFrameStyles(), className)}
        style={
          status.hasAchievements && status.latestAchievementColor
            ? {
                '--tw-ring-color': status.latestAchievementColor,
              } as React.CSSProperties
            : undefined
        }
      >
        <AvatarImage src={photoUrl || undefined} alt={fullName} />
        <AvatarFallback className="text-lg font-semibold">
          {fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {showBadges && (
        <div className="absolute -bottom-1 -right-1 flex gap-1">
          {/* Birthday badge takes priority */}
          {status.isBirthday ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerBirthdayConfetti();
              }}
              className="bg-pink-500 rounded-full p-1 shadow-lg border-2 border-background hover:scale-110 transition-transform cursor-pointer animate-pulse"
              aria-label="Celebrate birthday"
            >
              <Cake className="h-3 w-3 text-white" />
            </button>
          ) : status.hasAchievements && status.latestAchievementColor ? (
            <div 
              className="rounded-full p-1 shadow-lg border-2 border-background"
              style={{ backgroundColor: status.latestAchievementColor }}
            >
              <Award className="h-3 w-3 text-white" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
