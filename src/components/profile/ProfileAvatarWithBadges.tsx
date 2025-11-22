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
  });

  useEffect(() => {
    if (showBadges) {
      checkUserStatus();
    }
  }, [userId, showBadges]);

  const checkUserStatus = async () => {
    try {
      // Check for achievements
      const { data: achievements } = await supabase
        .from('employee_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .limit(1);

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
    if (status.isBirthday) {
      return 'ring-4 ring-pink-500 ring-offset-2 ring-offset-background';
    }
    if (status.hasAchievements) {
      return 'ring-4 ring-amber-500 ring-offset-2 ring-offset-background';
    }
    return '';
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(getFrameStyles(), className)}>
        <AvatarImage src={photoUrl || undefined} alt={fullName} />
        <AvatarFallback className="text-lg font-semibold">
          {fullName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {showBadges && (
        <div className="absolute -bottom-1 -right-1 flex gap-1">
          {status.isBirthday && (
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
          )}
          {status.hasAchievements && (
            <div className="bg-amber-500 rounded-full p-1 shadow-lg border-2 border-background">
              <Award className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
