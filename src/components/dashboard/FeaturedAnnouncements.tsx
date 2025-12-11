import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Cake, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnnouncementComments } from '@/components/announcements/AnnouncementComments';
import { AnnouncementReactions } from '@/components/announcements/AnnouncementReactions';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  featured_user_id: string | null;
  featured_user_ids: string[] | null;
  created_at: string;
  is_pinned: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
  birthday: string | null;
}

export function FeaturedAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      // Fetch featured announcements (Employee of the Month & Birthdays - excluding promotions)
      const { data: announcementData, error: announcementError } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('is_pinned', true)
        .not('featured_user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (announcementError) throw announcementError;

      // Filter out promotion announcements - they are private
      const filteredAnnouncements = (announcementData || []).filter(
        a => !a.title.toLowerCase().includes('promotion')
      );

      setAnnouncements(filteredAnnouncements);

      // Fetch profiles for all featured users (including arrays)
      if (announcementData && announcementData.length > 0) {
        const userIds = new Set<string>();
        
        announcementData.forEach(a => {
          // Add from featured_user_id (for backward compatibility)
          if (a.featured_user_id) {
            userIds.add(a.featured_user_id);
          }
          // Add from featured_user_ids array
          if (a.featured_user_ids && Array.isArray(a.featured_user_ids)) {
            a.featured_user_ids.forEach((id: string) => userIds.add(id));
          }
        });
        
        if (userIds.size > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, photo_url, position, department, birthday')
            .in('id', Array.from(userIds));

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Award className="h-5 w-5" />
          Featured Announcements
        </h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/announcement-gallery')}>
          View Timeline
        </Button>
      </div>

      {announcements.map((announcement) => {
        // Get all featured profiles - prefer featured_user_ids array, fallback to single featured_user_id
        const featuredUserIds = announcement.featured_user_ids && announcement.featured_user_ids.length > 0
          ? announcement.featured_user_ids
          : announcement.featured_user_id 
            ? [announcement.featured_user_id]
            : [];
        
        const featuredProfiles = featuredUserIds
          .map(id => profiles.get(id))
          .filter((p): p is Profile => p !== undefined);

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
                {/* Employee Info - Show all featured employees */}
                {featuredProfiles.length > 0 && (
                  <div className={featuredProfiles.length === 1 ? 'md:w-1/3' : 'w-full'}>
                    {featuredProfiles.length === 1 ? (
                      // Single employee layout
                      <div className="flex items-center gap-3">
                        <ProfileAvatarWithBadges
                          userId={featuredProfiles[0].id}
                          photoUrl={featuredProfiles[0].photo_url}
                          fullName={featuredProfiles[0].full_name}
                          className="h-20 w-20"
                        />
                        <div>
                          <p className="font-semibold text-lg">{featuredProfiles[0].full_name}</p>
                          <p className="text-sm text-muted-foreground">{featuredProfiles[0].position || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{featuredProfiles[0].department || 'N/A'}</p>
                        </div>
                      </div>
                    ) : (
                      // Multiple employees layout
                      <div className="flex flex-wrap gap-4">
                        {featuredProfiles.map((profile) => (
                          <div key={profile.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <ProfileAvatarWithBadges
                              userId={profile.id}
                              photoUrl={profile.photo_url}
                              fullName={profile.full_name}
                              className="h-14 w-14"
                            />
                            <div>
                              <p className="font-semibold">{profile.full_name}</p>
                              <p className="text-sm text-muted-foreground">{profile.position || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{profile.department || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Featured Image */}
                {announcement.image_url && (
                  <div className={featuredProfiles.length === 1 ? 'md:w-2/3' : 'w-full'}>
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

              {/* Reactions */}
              <AnnouncementReactions announcementId={announcement.id} />

              {/* Comments Section */}
              <AnnouncementComments announcementId={announcement.id} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
