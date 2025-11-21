import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Bell, FileText, ChevronDown, Send, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { SendMemoDialog } from '@/components/memos/SendMemoDialog';
import { EscalationStatus } from '@/components/memos/EscalationStatus';
import { DeleteMemoDialog } from '@/components/memos/DeleteMemoDialog';
import { MemoReplyDialog } from '@/components/memos/MemoReplyDialog';

interface MemoStats {
  id: string;
  title: string;
  content: string;
  type: 'memo' | 'reminder' | 'warning';
  created_at: string;
  recipient: {
    id: string;
    full_name: string;
    department: string | null;
  };
  is_read: boolean;
  escalated: boolean;
  escalate_after_hours: number | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by_profile?: {
    full_name: string;
  };
  replies_count: number;
  latest_reply_at: string | null;
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

export default function MemoAnalytics() {
  const [memos, setMemos] = useState<MemoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [showMemoDialog, setShowMemoDialog] = useState(false);
  const [filterResolved, setFilterResolved] = useState<string>('all');

  useEffect(() => {
    fetchMemoStats();
  }, []);

  const fetchMemoStats = async () => {
    const { data: memosData } = await supabase
      .from('memos')
      .select('id, title, content, type, created_at, is_read, escalated, escalate_after_hours, resolved, resolved_at, resolved_by, recipient_id')
      .order('created_at', { ascending: false });

    if (memosData) {
      // Fetch recipient profiles and reply counts for each memo
      const memosWithStats = await Promise.all(
        memosData.map(async (memo) => {
          // Fetch recipient profile
          const { data: recipientProfile } = await supabase
            .from('profiles')
            .select('id, full_name, department')
            .eq('id', memo.recipient_id)
            .single();

          // Fetch resolved by profile if resolved
          let resolvedByProfile = null;
          if (memo.resolved_by) {
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', memo.resolved_by)
              .single();
            resolvedByProfile = data;
          }

          // Fetch replies with user profiles
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
            id: memo.id,
            title: memo.title,
            content: memo.content,
            type: memo.type,
            created_at: memo.created_at,
            is_read: memo.is_read,
            escalated: memo.escalated,
            escalate_after_hours: memo.escalate_after_hours,
            resolved: memo.resolved,
            resolved_at: memo.resolved_at,
            resolved_by_profile: resolvedByProfile,
            recipient: recipientProfile || { id: '', full_name: 'Unknown', department: null },
            replies_count: repliesWithProfiles.length,
            latest_reply_at: repliesWithProfiles.length > 0 ? repliesWithProfiles[repliesWithProfiles.length - 1].created_at : null,
            replies: repliesWithProfiles,
          };
        })
      );

      setMemos(memosWithStats);
    }
    setLoading(false);
  };

  const sendReminder = async (recipientId: string, originalMemoTitle: string) => {
    setSelectedEmployee(recipientId);
    setShowMemoDialog(true);
  };

  const toggleResolved = async (memoId: string, currentlyResolved: boolean) => {
    try {
      const { error } = await supabase
        .from('memos')
        .update({
          resolved: !currentlyResolved,
          resolved_at: !currentlyResolved ? new Date().toISOString() : null,
          resolved_by: !currentlyResolved ? (await supabase.auth.getUser()).data.user?.id : null,
        })
        .eq('id', memoId);

      if (error) throw error;

      fetchMemoStats();
    } catch (error: any) {
      console.error('Error toggling resolved status:', error);
    }
  };

  const getMemoIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-warning" />;
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  const groupByEmployee = () => {
    let filteredMemos = memos;
    
    // Apply resolved filter
    if (filterResolved === 'resolved') {
      filteredMemos = memos.filter(m => m.resolved);
    } else if (filterResolved === 'unresolved') {
      filteredMemos = memos.filter(m => !m.resolved);
    }

    const grouped = filteredMemos.reduce((acc, memo) => {
      const employeeId = memo.recipient.id;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employee: memo.recipient,
          memos: [],
        };
      }
      acc[employeeId].memos.push(memo);
      return acc;
    }, {} as Record<string, { employee: { id: string; full_name: string; department: string | null }; memos: MemoStats[] }>);

    return Object.values(grouped);
  };

  if (loading) {
    return <div>Loading memo analytics...</div>;
  }

  const groupedData = groupByEmployee();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Memo Analytics</h1>
        <p className="text-muted-foreground">Track memo engagement and send reminders</p>
      </div>

      {/* Escalation Status */}
      <EscalationStatus />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Memos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Read Memos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memos.filter((m) => m.is_read).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unread Memos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memos.filter((m) => !m.is_read).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memos.filter((m) => m.resolved).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Replies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memos.reduce((sum, m) => sum + m.replies_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memos by Employee */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Memos by Employee</CardTitle>
              <CardDescription>View engagement status for each employee</CardDescription>
            </div>
            <Select value={filterResolved} onValueChange={setFilterResolved}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Memos</SelectItem>
                <SelectItem value="resolved">Resolved Only</SelectItem>
                <SelectItem value="unresolved">Unresolved Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {groupedData.map(({ employee, memos: employeeMemos }) => {
                const unreadCount = employeeMemos.filter((m) => !m.is_read).length;
                const totalReplies = employeeMemos.reduce((sum, m) => sum + m.replies_count, 0);

                return (
                  <Collapsible key={employee.id}>
                    <Card>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-left">
                              <ChevronDown className="h-5 w-5 transition-transform duration-200 ui-expanded:rotate-180" />
                              <div>
                                <CardTitle className="text-lg">{employee.full_name}</CardTitle>
                                <CardDescription>
                                  {employee.department || 'No department'}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right text-sm">
                                <div className="font-medium">{employeeMemos.length} memos</div>
                                <div className="text-muted-foreground">
                                  {unreadCount} unread • {totalReplies} replies
                                </div>
                              </div>
                              {unreadCount > 0 && (
                                <Badge variant="destructive">{unreadCount}</Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Separator className="mb-4" />
                          <div className="space-y-3">
                            {employeeMemos.map((memo) => (
                              <Card key={memo.id} className="bg-muted/30">
                                 <CardContent className="py-3 space-y-4">
                                   <div className="flex items-start justify-between gap-4">
                                     <div className="flex items-start gap-2 flex-1">
                                       {getMemoIcon(memo.type)}
                                       <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium truncate">{memo.title}</span>
                                            {!memo.is_read && (
                                              <Badge variant="secondary" className="text-xs">
                                                Unread
                                              </Badge>
                                            )}
                                            {memo.resolved && (
                                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Resolved
                                              </Badge>
                                            )}
                                            {memo.escalated && (
                                              <Badge variant="outline" className="text-xs">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Escalated
                                              </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {memo.type}
                                            </Badge>
                                          </div>
                                          <div className="text-sm text-muted-foreground mt-2 mb-2">
                                            {memo.content}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            Sent: {format(new Date(memo.created_at), 'PPp')}
                                            {memo.escalate_after_hours && (
                                              <>
                                                {' • '}
                                                Auto-escalate: {memo.escalate_after_hours}h
                                              </>
                                            )}
                                            {memo.replies_count > 0 && (
                                              <>
                                                {' • '}
                                                {memo.replies_count} {memo.replies_count === 1 ? 'reply' : 'replies'}
                                                {memo.latest_reply_at && (
                                                  <> • Last reply: {format(new Date(memo.latest_reply_at), 'PPp')}</>
                                                )}
                                              </>
                                            )}
                                            {memo.resolved && memo.resolved_at && (
                                              <>
                                                {' • '}
                                                Resolved: {format(new Date(memo.resolved_at), 'PPp')}
                                                {memo.resolved_by_profile && ` by ${memo.resolved_by_profile.full_name}`}
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant={memo.resolved ? "default" : "outline"}
                                          onClick={() => toggleResolved(memo.id, memo.resolved)}
                                          className={memo.resolved ? "bg-green-600 hover:bg-green-700" : ""}
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          {memo.resolved ? 'Unresolve' : 'Mark Resolved'}
                                        </Button>
                                        {!memo.is_read && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => sendReminder(employee.id, memo.title)}
                                          >
                                            <Send className="h-3 w-3 mr-1" />
                                            Remind
                                          </Button>
                                        )}
                                        <DeleteMemoDialog
                                          memoId={memo.id}
                                          memoTitle={memo.title}
                                          onDeleted={fetchMemoStats}
                                        />
                                      </div>
                                    </div>

                                   {/* Replies Section */}
                                   {memo.replies && memo.replies.length > 0 && (
                                     <div className="space-y-3 pt-3 border-t">
                                       <h4 className="font-semibold text-sm">Conversation ({memo.replies.length})</h4>
                                       <ScrollArea className="h-[200px]">
                                         <div className="space-y-2 pr-4">
                                           {memo.replies.map((reply) => (
                                             <Card key={reply.id} className="bg-background">
                                               <CardContent className="py-2 px-3">
                                                 <div className="flex justify-between items-start mb-1">
                                                   <span className="font-medium text-sm">
                                                     {reply.user_profile?.full_name || 'Unknown'}
                                                   </span>
                                                   <span className="text-xs text-muted-foreground">
                                                     {format(new Date(reply.created_at), 'PPp')}
                                                   </span>
                                                 </div>
                                                 <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                                               </CardContent>
                                             </Card>
                                           ))}
                                         </div>
                                       </ScrollArea>
                                     </div>
                                   )}

                                   {/* Reply Button */}
                                   <div className="pt-2 border-t">
                                     <MemoReplyDialog
                                       memoId={memo.id}
                                       memoTitle={memo.title}
                                       onReply={fetchMemoStats}
                                       buttonText="Reply as Admin"
                                     />
                                   </div>
                                 </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Send Reminder Dialog */}
      <SendMemoDialog
        open={showMemoDialog}
        onOpenChange={(open) => {
          setShowMemoDialog(open);
          if (!open) {
            setSelectedEmployee(null);
            fetchMemoStats();
          }
        }}
        preSelectedEmployeeId={selectedEmployee || undefined}
      />
    </div>
  );
}
