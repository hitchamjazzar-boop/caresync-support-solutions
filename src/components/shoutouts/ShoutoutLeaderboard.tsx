import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  count: number;
  profile?: {
    full_name: string;
    photo_url: string | null;
    position: string | null;
  };
}

export function ShoutoutLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    // Get all shoutouts and count by recipient
    const { data: shoutouts } = await supabase
      .from('shoutouts')
      .select('to_user_id');

    if (!shoutouts || shoutouts.length === 0) {
      setLoading(false);
      return;
    }

    // Count shoutouts per user
    const counts = shoutouts.reduce((acc, s) => {
      acc[s.to_user_id] = (acc[s.to_user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort by count and get top 10
    const sortedEntries = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([user_id, count]) => ({ user_id, count }));

    // Fetch profiles for top users
    const userIds = sortedEntries.map(e => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url, position')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    setLeaderboard(
      sortedEntries.map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id),
      }))
    );
    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return 'default';
      case 2:
      case 3:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Recognition Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              index < 3 ? 'bg-muted/50' : ''
            }`}
          >
            <div className="w-8 flex justify-center">
              {getRankIcon(index + 1)}
            </div>
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.profile?.photo_url || undefined} />
              <AvatarFallback>
                {entry.profile?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{entry.profile?.full_name}</p>
              {entry.profile?.position && (
                <p className="text-xs text-muted-foreground truncate">
                  {entry.profile.position}
                </p>
              )}
            </div>
            <Badge variant={getRankBadgeVariant(index + 1)}>
              {entry.count} {entry.count === 1 ? 'shout out' : 'shout outs'}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
