import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Cake, Calendar, Loader2 } from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface UpcomingBirthday {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  birthday: string;
  daysUntil: number;
}

export function BirthdayReminders() {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingBirthdays();
  }, []);

  const fetchUpcomingBirthdays = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, position, birthday')
        .not('birthday', 'is', null);

      if (error) throw error;

      const today = new Date();
      const sevenDaysFromNow = addDays(today, 7);

      const upcoming: UpcomingBirthday[] = [];

      profiles?.forEach((profile) => {
        if (!profile.birthday) return;

        const birthday = parseISO(profile.birthday);
        const currentYear = today.getFullYear();
        
        // Create birthday date for current year
        const birthdayThisYear = new Date(
          currentYear,
          birthday.getMonth(),
          birthday.getDate()
        );

        // Create birthday date for next year
        const birthdayNextYear = new Date(
          currentYear + 1,
          birthday.getMonth(),
          birthday.getDate()
        );

        // Check if birthday is within the next 7 days
        let targetBirthday = birthdayThisYear;
        let daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // If birthday already passed this year, check next year
        if (daysUntil < 0) {
          targetBirthday = birthdayNextYear;
          daysUntil = Math.ceil((birthdayNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Include if within 7 days
        if (daysUntil >= 0 && daysUntil <= 7) {
          upcoming.push({
            ...profile,
            birthday: profile.birthday,
            daysUntil,
          });
        }
      });

      // Sort by days until birthday
      upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

      setUpcomingBirthdays(upcoming);
    } catch (error) {
      console.error('Error fetching birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilText = (days: number) => {
    if (days === 0) return 'Today! 🎉';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (upcomingBirthdays.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            <CardTitle>Upcoming Birthdays</CardTitle>
          </div>
          <Badge variant="secondary">{upcomingBirthdays.length} upcoming</Badge>
        </div>
        <CardDescription>
          Don't forget to create birthday announcements for these employees!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingBirthdays.map((employee) => (
          <div
            key={employee.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ProfileAvatarWithBadges
                userId={employee.id}
                photoUrl={employee.photo_url}
                fullName={employee.full_name}
                className="h-10 w-10"
              />
              <div>
                <p className="font-medium">{employee.full_name}</p>
                <p className="text-sm text-muted-foreground">{employee.position || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <Badge variant={employee.daysUntil === 0 ? 'default' : 'secondary'}>
                  <Calendar className="mr-1 h-3 w-3" />
                  {getDaysUntilText(employee.daysUntil)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(employee.birthday), 'MMM dd')}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/announcements')}
              >
                Create
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
