import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, CheckCircle, Users, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AnnouncementStats {
  id: string;
  title: string;
  created_at: string;
  is_pinned: boolean;
  target_type: string;
  target_users: string[] | null;
  target_roles: string[] | null;
  target_departments: string[] | null;
  total_reads: number;
  total_acknowledgments: number;
  eligible_users: number;
  department_breakdown: { department: string; reads: number; acknowledgments: number; total: number }[];
}

export default function AnnouncementAnalytics() {
  const [stats, setStats] = useState<AnnouncementStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get total user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setTotalUsers(userCount || 0);

      // Get all announcements
      const { data: announcements, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (announcementsError) throw announcementsError;

      // Get all profiles with departments
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, department');

      if (profilesError) throw profilesError;

      // Get all reads
      const { data: reads, error: readsError } = await supabase
        .from('announcement_reads')
        .select('announcement_id, user_id');

      if (readsError) throw readsError;

      // Get all acknowledgments
      const { data: acknowledgments, error: acknowledgementsError } = await supabase
        .from('announcement_acknowledgments')
        .select('announcement_id, user_id');

      if (acknowledgementsError) throw acknowledgementsError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Calculate stats for each announcement
      const analyticsData: AnnouncementStats[] = (announcements || []).map((announcement) => {
        // Determine eligible users based on targeting
        let eligibleUserIds: string[] = [];
        const profileMap = new Map(profiles?.map(p => [p.id, p.department]) || []);

        if (announcement.target_type === 'all') {
          eligibleUserIds = profiles?.map(p => p.id) || [];
        } else if (announcement.target_type === 'specific_users' && announcement.target_users) {
          eligibleUserIds = announcement.target_users;
        } else if (announcement.target_type === 'roles' && announcement.target_roles) {
          eligibleUserIds = userRoles
            ?.filter(ur => announcement.target_roles?.includes(ur.role))
            .map(ur => ur.user_id) || [];
        } else if (announcement.target_type === 'departments' && announcement.target_departments) {
          eligibleUserIds = profiles
            ?.filter(p => p.department && announcement.target_departments?.includes(p.department))
            .map(p => p.id) || [];
        }

        // Count reads and acknowledgments
        const announcementReads = reads?.filter(r => r.announcement_id === announcement.id) || [];
        const announcementAcknowledgments = acknowledgments?.filter(a => a.announcement_id === announcement.id) || [];

        // Calculate department breakdown
        const departmentStats = new Map<string, { reads: number; acknowledgments: number; total: number }>();
        
        eligibleUserIds.forEach(userId => {
          const department = profileMap.get(userId) || 'No Department';
          if (!departmentStats.has(department)) {
            departmentStats.set(department, { reads: 0, acknowledgments: 0, total: 0 });
          }
          const stats = departmentStats.get(department)!;
          stats.total += 1;
          if (announcementReads.some(r => r.user_id === userId)) {
            stats.reads += 1;
          }
          if (announcementAcknowledgments.some(a => a.user_id === userId)) {
            stats.acknowledgments += 1;
          }
        });

        const department_breakdown = Array.from(departmentStats.entries()).map(([department, stats]) => ({
          department,
          ...stats
        }));

        return {
          id: announcement.id,
          title: announcement.title,
          created_at: announcement.created_at,
          is_pinned: announcement.is_pinned,
          target_type: announcement.target_type,
          target_users: announcement.target_users,
          target_roles: announcement.target_roles,
          target_departments: announcement.target_departments,
          total_reads: announcementReads.length,
          total_acknowledgments: announcementAcknowledgments.length,
          eligible_users: eligibleUserIds.length,
          department_breakdown
        };
      });

      setStats(analyticsData);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTargetingBadge = (announcement: AnnouncementStats) => {
    if (announcement.target_type === 'all') {
      return <Badge variant="secondary">All Users</Badge>;
    }
    if (announcement.target_type === 'specific_users') {
      return <Badge variant="secondary">Specific Users ({announcement.target_users?.length || 0})</Badge>;
    }
    if (announcement.target_type === 'roles') {
      return <Badge variant="secondary">Roles: {announcement.target_roles?.join(', ')}</Badge>;
    }
    if (announcement.target_type === 'departments') {
      return <Badge variant="secondary">Departments: {announcement.target_departments?.join(', ')}</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Announcement Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Track engagement and reach for all announcements
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Announcements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Read Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.length > 0
                ? Math.round(
                    (stats.reduce((sum, s) => sum + (s.eligible_users > 0 ? (s.total_reads / s.eligible_users) * 100 : 0), 0) / stats.length)
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcement Stats */}
      <div className="space-y-4">
        {stats.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No announcements to analyze yet.
            </CardContent>
          </Card>
        ) : (
          stats.map((announcement) => {
            const readRate = announcement.eligible_users > 0
              ? Math.round((announcement.total_reads / announcement.eligible_users) * 100)
              : 0;
            const acknowledgmentRate = announcement.eligible_users > 0
              ? Math.round((announcement.total_acknowledgments / announcement.eligible_users) * 100)
              : 0;

            return (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        {announcement.is_pinned && (
                          <Badge variant="default" className="bg-amber-600">📌 Pinned</Badge>
                        )}
                        {getTargetingBadge(announcement)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(announcement.created_at), 'PPP')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Overall Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>Read Rate</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold">{readRate}%</span>
                          <span className="text-muted-foreground">
                            {announcement.total_reads} / {announcement.eligible_users}
                          </span>
                        </div>
                        <Progress value={readRate} className="h-2" />
                      </div>
                    </div>

                    {announcement.is_pinned && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4" />
                          <span>Acknowledgment Rate</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-semibold">{acknowledgmentRate}%</span>
                            <span className="text-muted-foreground">
                              {announcement.total_acknowledgments} / {announcement.eligible_users}
                            </span>
                          </div>
                          <Progress value={acknowledgmentRate} className="h-2" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Eligible Users</span>
                      </div>
                      <div className="text-2xl font-bold">{announcement.eligible_users}</div>
                    </div>
                  </div>

                  {/* Department Breakdown */}
                  {announcement.department_breakdown.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Department Breakdown</h4>
                      <div className="space-y-3">
                        {announcement.department_breakdown.map((dept) => {
                          const deptReadRate = dept.total > 0 ? Math.round((dept.reads / dept.total) * 100) : 0;
                          const deptAckRate = dept.total > 0 ? Math.round((dept.acknowledgments / dept.total) * 100) : 0;

                          return (
                            <div key={dept.department} className="space-y-2 p-3 rounded-lg bg-muted/50">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">{dept.department}</span>
                                <span className="text-xs text-muted-foreground">{dept.total} users</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Reads</span>
                                    <span>{deptReadRate}%</span>
                                  </div>
                                  <Progress value={deptReadRate} className="h-1.5" />
                                </div>
                                {announcement.is_pinned && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-muted-foreground">Acknowledgments</span>
                                      <span>{deptAckRate}%</span>
                                    </div>
                                    <Progress value={deptAckRate} className="h-1.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
