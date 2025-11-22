import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Award, Cake, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnnouncementComments } from '@/components/announcements/AnnouncementComments';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  featured_user_id: string | null;
  created_at: string;
  is_pinned: boolean;
}

interface Profile {
  full_name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
  birthday: string | null;
}

export function FeaturedAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [birthdayEmployees, setBirthdayEmployees] = useState<(Profile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('featured-announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // Fetch featured announcements (Employee of the Month & Birthdays)
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('is_pinned', true)
        .not('featured_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (announcementError) throw announcementError;

      setAnnouncements(announcementData || []);

      // Fetch profiles for featured users
      if (announcementData && announcementData.length > 0) {
        const userIds = announcementData
          .map(a => a.featured_user_id)
          .filter(Boolean) as string[];
        
        if (userIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);

          if (profileData) {
            const profilesMap = new Map(profileData.map(p => [p.id, p]));
            setProfiles(profilesMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching featured data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Award className="h-5 w-5" />
        Featured Announcements
      </h2>

      {announcements.map((announcement) => {
        const profile = announcement.featured_user_id 
          ? profiles.get(announcement.featured_user_id) 
          : null;

        const isBirthday = announcement.title.toLowerCase().includes('birthday');

        return (
          <Card key={announcement.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {isBirthday ? (
                    <Cake className="h-5 w-5 text-pink-500" />
                  ) : (
                    <Award className="h-5 w-5 text-yellow-500" />
                  )}
                  {announcement.title}
                </CardTitle>
                <Badge variant="secondary">
                  {format(new Date(announcement.created_at), 'MMM dd, yyyy')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Employee Info */}
                {profile && (
                  <div className="flex items-center gap-3 md:w-1/3">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.photo_url || undefined} />
                      <AvatarFallback className="text-2xl">
                        {profile.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground">{profile.position || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{profile.department || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Featured Image */}
                {announcement.image_url && (
                  <div className="md:w-2/3">
                    <img
                      src={announcement.image_url}
                      alt={announcement.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
              </div>

              {/* Comments Section */}
              <AnnouncementComments announcementId={announcement.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
