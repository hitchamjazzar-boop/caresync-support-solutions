import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Bell, FileText, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { MemoReplyDialog } from '@/components/memos/MemoReplyDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SendMemoDialog } from '@/components/memos/SendMemoDialog';
import { useAdmin } from '@/hooks/useAdmin';
interface Memo {
  id: string;
  title: string;
  content: string;
  type: 'memo' | 'reminder' | 'warning';
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_profile?: {
    full_name: string;
  };
  sender_profile?: {
    full_name: string;
  };
  replies?: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    user_profile?: {
      full_name: string;
    };
  }[];
}

export default function Memos() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filteredMemos, setFilteredMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sendMemoOpen, setSendMemoOpen] = useState(false);

  useEffect(() => {
    fetchMemos();

    const channel = supabase
      .channel('memos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memos',
          filter: `recipient_id=eq.${user?.id}`,
        },
        () => {
          fetchMemos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [memos, searchQuery, filterType, filterStatus]);

  const fetchMemos = async () => {
    if (!user) return;

    const { data: memosData } = await supabase
      .from('memos')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (memosData) {
      // Fetch sender profiles and replies for each memo
      const memosWithDetails = await Promise.all(
        memosData.map(async (memo) => {
          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', memo.sender_id)
            .single();

          // Fetch resolved by profile if resolved
          let resolvedByProfile = null;
          if (memo.resolved_by) {
            const { data: resolvedProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', memo.resolved_by)
              .single();
            resolvedByProfile = resolvedProfile;
          }

          // Fetch replies
          const { data: repliesData } = await supabase
            .from('memo_replies')
            .select('*')
            .eq('memo_id', memo.id)
            .order('created_at', { ascending: true });

          // Fetch reply user profiles
          const repliesWithProfiles = repliesData ? await Promise.all(
            repliesData.map(async (reply) => {
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', reply.user_id)
                .single();
              
              return {
                ...reply,
                user_profile: userProfile,
              };
            })
          ) : [];

          return {
            ...memo,
            sender_profile: senderProfile,
            resolved_by_profile: resolvedByProfile,
            replies: repliesWithProfiles,
          };
        })
      );

      setMemos(memosWithDetails);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...memos];

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (memo) =>
          memo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          memo.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((memo) => memo.type === filterType);
    }

    // Apply status filter
    if (filterStatus === 'read') {
      filtered = filtered.filter((memo) => memo.is_read);
    } else if (filterStatus === 'unread') {
      filtered = filtered.filter((memo) => !memo.is_read);
    }

    setFilteredMemos(filtered);
  };

  const markAsRead = async (memoId: string) => {
    await supabase
      .from('memos')
      .update({ is_read: true })
      .eq('id', memoId);
    
    fetchMemos();
  };

  const getMemoIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'reminder':
        return <Bell className="h-5 w-5 text-warning" />;
      default:
        return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  const getMemoColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-destructive';
      case 'reminder':
        return 'border-warning';
      default:
        return 'border-primary';
    }
  };

  if (loading) {
    return <div>Loading memos...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Memos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage all your memos</p>
        </div>
        {isAdmin && (
          <>
            <Button onClick={() => setSendMemoOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Send Memo
            </Button>
            <SendMemoDialog open={sendMemoOpen} onOpenChange={setSendMemoOpen} />
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="memo">Memo</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Memos List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredMemos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm sm:text-base">
              No memos found
            </CardContent>
          </Card>
        ) : (
          filteredMemos.map((memo) => (
            <Card key={memo.id} className={`border-l-4 ${getMemoColor(memo.type)}`}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getMemoIcon(memo.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base sm:text-xl break-words">{memo.title}</CardTitle>
                        {!memo.is_read && (
                          <Badge variant="secondary" className="text-xs">New</Badge>
                        )}
                        {memo.resolved && (
                          <Badge variant="default" className="bg-green-600 text-xs">Resolved ✓</Badge>
                        )}
                        <Badge variant="outline" className="capitalize text-xs">
                          {memo.type}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        <span className="block sm:inline">From: {memo.sender_profile?.full_name}</span>
                        <span className="hidden sm:inline"> • </span>
                        <span className="block sm:inline">{format(new Date(memo.created_at), 'PPpp')}</span>
                        {memo.expires_at && (
                          <span className="block sm:inline">
                            <span className="hidden sm:inline"> • </span>
                            Expires: {format(new Date(memo.expires_at), 'PPP')}
                          </span>
                        )}
                        {memo.resolved && memo.resolved_at && (
                          <div className="mt-1 text-green-600 dark:text-green-400 font-medium">
                            Resolved by {memo.resolved_by_profile?.full_name} on {format(new Date(memo.resolved_at), 'PPp')}
                          </div>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                <p className="whitespace-pre-wrap text-sm sm:text-base">{memo.content}</p>

                {/* Replies Section */}
                {memo.replies && memo.replies.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-xs sm:text-sm">Replies ({memo.replies.length})</h4>
                    <ScrollArea className="h-[150px] sm:h-[200px]">
                      <div className="space-y-3 pr-4">
                        {memo.replies.map((reply) => (
                          <Card key={reply.id} className="bg-muted/50">
                            <CardContent className="p-3">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-2">
                                <span className="font-medium text-xs sm:text-sm">
                                  {reply.user_profile?.full_name || 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(reply.created_at), 'PPp')}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm whitespace-pre-wrap">{reply.content}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {!memo.is_read && (
                    <MemoReplyDialog
                      memoId={memo.id}
                      memoTitle={memo.title}
                      onReply={() => {
                        markAsRead(memo.id);
                        fetchMemos();
                      }}
                    />
                  )}
                  {memo.is_read && (
                    <MemoReplyDialog
                      memoId={memo.id}
                      memoTitle={memo.title}
                      onReply={fetchMemos}
                      buttonText="Add Reply"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
