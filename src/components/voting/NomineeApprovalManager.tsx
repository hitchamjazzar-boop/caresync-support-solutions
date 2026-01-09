import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, X, Clock, Users, Eye, EyeOff } from 'lucide-react';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Nomination {
  id: string;
  nominated_user_id: string;
  nominator_user_id: string;
  comment: string | null;
  is_approved: boolean | null;
  created_at: string;
  nominated_profile: {
    full_name: string;
    position: string | null;
    photo_url: string | null;
  };
  nominator_profile: {
    full_name: string;
  };
}

interface NomineeApprovalManagerProps {
  votingPeriodId: string;
  onApprovalChange?: () => void;
}

export const NomineeApprovalManager = ({ votingPeriodId, onApprovalChange }: NomineeApprovalManagerProps) => {
  const { user } = useAuth();
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNominations();
  }, [votingPeriodId]);

  const fetchNominations = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_nominations')
        .select('id, nominated_user_id, nominator_user_id, comment, is_approved, created_at')
        .eq('voting_period_id', votingPeriodId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setNominations([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const nominatedIds = [...new Set(data.map(n => n.nominated_user_id))];
      const nominatorIds = [...new Set(data.map(n => n.nominator_user_id))];
      const allIds = [...new Set([...nominatedIds, ...nominatorIds])];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', allIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      const nominationsWithProfiles: Nomination[] = data.map(n => ({
        ...n,
        nominated_profile: {
          full_name: profileMap.get(n.nominated_user_id)?.full_name || 'Unknown',
          position: profileMap.get(n.nominated_user_id)?.position || null,
          photo_url: profileMap.get(n.nominated_user_id)?.photo_url || null,
        },
        nominator_profile: {
          full_name: profileMap.get(n.nominator_user_id)?.full_name || 'Unknown',
        },
      }));

      setNominations(nominationsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching nominations:', error);
      toast.error('Failed to load nominations');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (nominationId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_nominations')
        .update({
          is_approved: approved,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', nominationId);

      if (error) throw error;

      toast.success(approved ? 'Nominee approved' : 'Nominee rejected');
      fetchNominations();
      onApprovalChange?.();
    } catch (error: any) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval status');
    }
  };

  const handleApproveAll = async () => {
    const pendingNominations = nominations.filter(n => n.is_approved === null);
    if (pendingNominations.length === 0) {
      toast.info('No pending nominations to approve');
      return;
    }

    try {
      const { error } = await supabase
        .from('employee_nominations')
        .update({
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('voting_period_id', votingPeriodId)
        .is('is_approved', null);

      if (error) throw error;

      toast.success(`Approved ${pendingNominations.length} nominations`);
      fetchNominations();
      onApprovalChange?.();
    } catch (error: any) {
      console.error('Error approving all:', error);
      toast.error('Failed to approve all nominations');
    }
  };

  const getStatusBadge = (isApproved: boolean | null) => {
    if (isApproved === null) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending Review</Badge>;
    }
    if (isApproved) {
      return <Badge className="bg-green-600"><Eye className="h-3 w-3 mr-1" /> Visible to Voters</Badge>;
    }
    return <Badge variant="destructive"><EyeOff className="h-3 w-3 mr-1" /> Hidden</Badge>;
  };

  // Group nominations by nominated user
  const groupedNominations = nominations.reduce((acc, nom) => {
    if (!acc[nom.nominated_user_id]) {
      acc[nom.nominated_user_id] = [];
    }
    acc[nom.nominated_user_id].push(nom);
    return acc;
  }, {} as Record<string, Nomination[]>);

  if (loading) {
    return <div className="text-center py-4">Loading nominations...</div>;
  }

  const pendingCount = nominations.filter(n => n.is_approved === null).length;
  const approvedCount = nominations.filter(n => n.is_approved === true).length;

  // Count unique approved nominees (users who can be voted for)
  const approvedNominees = new Set(
    nominations.filter(n => n.is_approved === true).map(n => n.nominated_user_id)
  ).size;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Manage Nominees
              </CardTitle>
              <CardDescription>
                Review nominations and show approved nominees to voters
              </CardDescription>
            </div>
            {pendingCount > 0 && (
              <Button onClick={handleApproveAll} size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Show All to Voters
              </Button>
            )}
          </div>
          
          {/* Status Summary */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              {pendingCount} pending review
            </Badge>
            <Badge className="bg-green-600 text-sm">
              <Eye className="h-3 w-3 mr-1" />
              {approvedNominees} visible to voters
            </Badge>
            {nominations.filter(n => n.is_approved === false).length > 0 && (
              <Badge variant="destructive" className="text-sm">
                <EyeOff className="h-3 w-3 mr-1" />
                {nominations.filter(n => n.is_approved === false).length} hidden
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedNominations).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No nominations received yet.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedNominations).map(([userId, noms]) => {
              const firstNom = noms[0];
              const latestApprovalStatus = noms.find(n => n.is_approved !== null)?.is_approved ?? null;
              
              return (
                <div key={userId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ProfileAvatarWithBadges
                        userId={userId}
                        photoUrl={firstNom.nominated_profile.photo_url}
                        fullName={firstNom.nominated_profile.full_name}
                        className="h-12 w-12"
                      />
                      <div>
                        <div className="font-medium">{firstNom.nominated_profile.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {firstNom.nominated_profile.position || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {noms.length} {noms.length === 1 ? 'nomination' : 'nominations'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(latestApprovalStatus)}
                    </div>
                  </div>

                  {/* Show individual nominations */}
                  <div className="mt-3 space-y-2">
                    {noms.map((nom) => (
                      <div key={nom.id} className="bg-muted/50 rounded p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-1">
                              Nominated by {nom.nominator_profile.full_name}
                            </div>
                            {nom.comment && (
                              <p className="text-foreground">{nom.comment}</p>
                            )}
                          </div>
                          {nom.is_approved === null && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproval(nom.id, true)}
                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Show
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproval(nom.id, false)}
                                className="h-8 text-destructive hover:text-destructive"
                              >
                                <EyeOff className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};