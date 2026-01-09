import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Clock, Eye, EyeOff } from 'lucide-react';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface NominationGroup {
  nominated_user_id: string;
  nomination_count: number;
  is_approved: boolean | null;
  profile: {
    full_name: string;
    position: string | null;
    photo_url: string | null;
  };
}

interface NominationsViewProps {
  votingPeriodId: string;
}

export const NominationsView = ({ votingPeriodId }: NominationsViewProps) => {
  const [nominations, setNominations] = useState<NominationGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNominations();
  }, [votingPeriodId]);

  const fetchNominations = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_nominations')
        .select('nominated_user_id, is_approved')
        .eq('voting_period_id', votingPeriodId);

      if (error) throw error;

      if (!data || data.length === 0) {
        setNominations([]);
        setLoading(false);
        return;
      }

      // Group by nominated user and count
      const groupedMap = new Map<string, { count: number; is_approved: boolean | null }>();
      data.forEach(n => {
        const existing = groupedMap.get(n.nominated_user_id);
        if (existing) {
          existing.count++;
          // If any nomination is approved, mark as approved
          if (n.is_approved === true) existing.is_approved = true;
        } else {
          groupedMap.set(n.nominated_user_id, { count: 1, is_approved: n.is_approved });
        }
      });

      // Fetch profiles
      const userIds = Array.from(groupedMap.keys());
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      const grouped: NominationGroup[] = Array.from(groupedMap.entries()).map(([userId, data]) => ({
        nominated_user_id: userId,
        nomination_count: data.count,
        is_approved: data.is_approved,
        profile: {
          full_name: profileMap.get(userId)?.full_name || 'Unknown',
          position: profileMap.get(userId)?.position || null,
          photo_url: profileMap.get(userId)?.photo_url || null,
        },
      }));

      // Sort by nomination count descending
      grouped.sort((a, b) => b.nomination_count - a.nomination_count);

      setNominations(grouped);
    } catch (error: any) {
      console.error('Error fetching nominations:', error);
      toast.error('Failed to load nominations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (isApproved: boolean | null) => {
    if (isApproved === null) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
    if (isApproved) {
      return <Badge className="bg-green-600"><Eye className="h-3 w-3 mr-1" /> Can Vote</Badge>;
    }
    return <Badge variant="destructive"><EyeOff className="h-3 w-3 mr-1" /> Not Approved</Badge>;
  };

  if (loading) {
    return <div className="text-center py-4">Loading nominations...</div>;
  }

  if (nominations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No nominations yet. Be the first to nominate someone!
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Current Nominations
        </CardTitle>
        <CardDescription>
          {nominations.length} {nominations.length === 1 ? 'person has' : 'people have'} been nominated
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {nominations.map((nom) => (
            <div key={nom.nominated_user_id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <ProfileAvatarWithBadges
                  userId={nom.nominated_user_id}
                  photoUrl={nom.profile.photo_url}
                  fullName={nom.profile.full_name}
                  className="h-10 w-10"
                />
                <div>
                  <div className="font-medium">{nom.profile.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {nom.profile.position || 'N/A'} • {nom.nomination_count} {nom.nomination_count === 1 ? 'nomination' : 'nominations'}
                  </div>
                </div>
              </div>
              {getStatusBadge(nom.is_approved)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};