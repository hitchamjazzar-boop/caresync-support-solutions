import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Cake, Calendar, Loader2, ArrowLeft, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnnouncementReactions } from '@/components/announcements/AnnouncementReactions';
import { AnnouncementComments } from '@/components/announcements/AnnouncementComments';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  featured_user_id: string | null;
  featured_user_ids: string[] | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
}

export default function AnnouncementGallery() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnnouncements();
    if (user) {
      fetchReadStatus();
    }
  }, [user]);

  // Handle highlighted announcement from notifications
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && announcements.length > 0) {
      const announcement = announcements.find(a => a.id === highlightId);
      
      // Scroll to highlighted announcement after a short delay to ensure rendering
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Trigger confetti for celebration announcements
        if (announcement) {
          const isBirthday = announcement.title.toLowerCase().includes('birthday');
          const isEmployeeOfMonth = announcement.title.toLowerCase().includes('employee of');
          const isPromotion = announcement.title.toLowerCase().includes('promotion');
          const isCelebration = isBirthday || isEmployeeOfMonth || isPromotion ||
                                announcement.title.toLowerCase().includes('congratulations');
          
          if (isCelebration) {
            // Trigger confetti and sound after scroll completes
            setTimeout(() => {
              Promise.all([
                import('@/lib/confetti'),
                import('@/lib/sounds')
              ]).then(([{ triggerBirthdayConfetti, triggerAchievementConfetti }, { playBirthdaySound, playCelebrationSound }]) => {
                if (isBirthday) {
                  triggerBirthdayConfetti();
                  playBirthdaySound();
                } else {
                  triggerAchievementConfetti();
                  playCelebrationSound();
                }
              });
            }, 500);
          }
        }
        
        // Remove highlight param after scrolling and showing
        setTimeout(() => {
          searchParams.delete('highlight');
          setSearchParams(searchParams, { replace: true });
        }, 3000);
      }, 300);
    }
  }, [searchParams, announcements, setSearchParams]);

  const fetchAnnouncements = async () => {
    try {
      const { data: announcementData, error } = await supabase
        .from('announcements')
        .select('*')
        .not('featured_user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out promotion announcements - they are private and only shown in notifications
      const filteredAnnouncements = (announcementData || []).filter(
        a => !a.title.toLowerCase().includes('promotion')
      );

      setAnnouncements(filteredAnnouncements);

      // Fetch profiles for all featured users (including arrays)
      if (announcementData && announcementData.length > 0) {
        const userIds = new Set<string>();
        
        announcementData.forEach(a => {
          if (a.featured_user_id) {
            userIds.add(a.featured_user_id);
          }
          if (a.featured_user_ids && Array.isArray(a.featured_user_ids)) {
            a.featured_user_ids.forEach((id: string) => userIds.add(id));
          }
        });
        
        if (userIds.size > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, photo_url, position, department')
            .in('id', Array.from(userIds));

          if (profileData) {
            const profilesMap = new Map(profileData.map(p => [p.id, p]));
            setProfiles(profilesMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const readIds = new Set(data?.map(r => r.announcement_id) || []);
      setReadAnnouncementIds(readIds);
    } catch (error) {
      console.error('Error fetching read status:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user || announcements.length === 0) return;

    setMarkingAllRead(true);
    try {
      // Get all unread announcement IDs
      const unreadIds = announcements
        .map(a => a.id)
        .filter(id => !readAnnouncementIds.has(id));

      if (unreadIds.length === 0) {
        setMarkingAllRead(false);
        return;
      }

      // Insert read records for all unread announcements
      const readRecords = unreadIds.map(announcementId => ({
        user_id: user.id,
        announcement_id: announcementId,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('announcement_reads')
        .insert(readRecords);

      if (error) throw error;

      // Update local state
      setReadAnnouncementIds(new Set([...readAnnouncementIds, ...unreadIds]));
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Group announcements by month/year
  const groupedAnnouncements = announcements.reduce((acc, announcement) => {
    const monthYear = format(new Date(announcement.created_at), 'MMMM yyyy');
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(announcement);
    return acc;
  }, {} as Record<string, Announcement[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 sm:h-8 w-6 sm:w-8" />
            Announcement Timeline
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse all Employee of the Month and Birthday celebrations
          </p>
        </div>
        {user && announcements.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAllRead || announcements.every(a => readAnnouncementIds.has(a.id))}
            className="gap-2 w-full sm:w-auto"
          >
            {markingAllRead ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </>
            )}
          </Button>
        )}
      </div>

      {Object.keys(groupedAnnouncements).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
            <Award className="h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mb-4" />
            <p className="text-base sm:text-lg font-medium">No announcements yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Featured announcements will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {Object.entries(groupedAnnouncements).map(([monthYear, monthAnnouncements]) => (
            <div key={monthYear} className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl font-semibold">{monthYear}</h2>
                <Badge variant="secondary" className="text-xs">{monthAnnouncements.length} announcements</Badge>
              </div>

              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                {monthAnnouncements.map((announcement) => {
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
                  const isPromotion = announcement.title.toLowerCase().includes('promotion');
                  const isHighlighted = searchParams.get('highlight') === announcement.id;

                  return (
                    <Card 
                      key={announcement.id} 
                      className={`overflow-hidden transition-all duration-300 ${
                        isHighlighted ? 'ring-2 ring-primary shadow-lg animate-pulse' : ''
                      }`}
                      ref={isHighlighted ? highlightedRef : null}
                    >
                      <CardHeader className="pb-3 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="gap-1 text-xs">
                              {isBirthday ? (
                                <>
                                  <Cake className="h-3 w-3" />
                                  Birthday
                                </>
                              ) : isPromotion ? (
                                <>
                                  <Award className="h-3 w-3" />
                                  Promotion
                                </>
                              ) : (
                                <>
                                  <Award className="h-3 w-3" />
                                  <span className="hidden sm:inline">Employee of Month</span>
                                  <span className="sm:hidden">EOM</span>
                                </>
                              )}
                            </Badge>
                            {!readAnnouncementIds.has(announcement.id) && (
                              <Badge 
                                variant="default" 
                                className="gap-1 bg-primary text-primary-foreground animate-pulse text-xs"
                              >
                                New
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(announcement.created_at), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <CardTitle className="text-base sm:text-lg">{announcement.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
                        {/* Employee Info - Show all featured employees */}
                        {featuredProfiles.length > 0 && (
                          <div className={featuredProfiles.length === 1 ? '' : 'flex flex-wrap gap-3'}>
                            {featuredProfiles.length === 1 ? (
                              // Single employee layout
                              <div className="flex items-center gap-2">
                                <ProfileAvatarWithBadges
                                  userId={featuredProfiles[0].id}
                                  photoUrl={featuredProfiles[0].photo_url}
                                  fullName={featuredProfiles[0].full_name}
                                  className="h-12 w-12"
                                />
                                <div>
                                  <p className="font-medium text-sm">{featuredProfiles[0].full_name}</p>
                                  <p className="text-xs text-muted-foreground">{featuredProfiles[0].position || 'N/A'}</p>
                                </div>
                              </div>
                            ) : (
                              // Multiple employees layout
                              featuredProfiles.map((profile) => (
                                <div key={profile.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                  <ProfileAvatarWithBadges
                                    userId={profile.id}
                                    photoUrl={profile.photo_url}
                                    fullName={profile.full_name}
                                    className="h-10 w-10"
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{profile.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{profile.position || 'N/A'}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Featured Image */}
                        {announcement.image_url && (
                          <img
                            src={announcement.image_url}
                            alt={announcement.title}
                            className="w-full rounded-md"
                          />
                        )}

                        {/* Content */}
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {announcement.content}
                        </p>

                        {/* Reactions */}
                        <AnnouncementReactions announcementId={announcement.id} />

                        {/* Comments */}
                        <AnnouncementComments announcementId={announcement.id} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
