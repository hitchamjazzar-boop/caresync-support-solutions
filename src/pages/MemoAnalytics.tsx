import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertTriangle, Bell, FileText, ChevronDown, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { SendMemoDialog } from '@/components/memos/SendMemoDialog';

interface MemoStats {
  id: string;
  title: string;
  type: 'memo' | 'reminder' | 'warning';
  created_at: string;
  recipient: {
    id: string;
    full_name: string;
    department: string | null;
  };
  is_read: boolean;
  replies_count: number;
  latest_reply_at: string | null;
}

export default function MemoAnalytics() {
  const [memos, setMemos] = useState<MemoStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  useEffect(() => {
    fetchMemoStats();
  }, []);

  const fetchMemoStats = async () => {
    const { data: memosData } = await supabase
      .from('memos')
      .select(`
        id,
        title,
        type,
        created_at,
        is_read,
        recipient:profiles!memos_recipient_id_fkey(id, full_name, department)
      `)
      .order('created_at', { ascending: false });

    if (memosData) {
      // Fetch reply counts for each memo
      const memosWithStats = await Promise.all(
        memosData.map(async (memo) => {
          const { data: repliesData, count } = await supabase
            .from('memo_replies')
            .select('created_at', { count: 'exact' })
            .eq('memo_id', memo.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...memo,
            replies_count: count || 0,
            latest_reply_at: repliesData && repliesData.length > 0 ? repliesData[0].created_at : null,
          };
        })
      );

      setMemos(memosWithStats);
    }
    setLoading(false);
  };

  const sendReminder = async (recipientId: string, originalMemoTitle: string) => {
    setSelectedEmployee(recipientId);
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
    const grouped = memos.reduce((acc, memo) => {
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

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
          <CardTitle>Memos by Employee</CardTitle>
          <CardDescription>View engagement status for each employee</CardDescription>
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
                                <CardContent className="py-3">
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
                                          <Badge variant="outline" className="text-xs capitalize">
                                            {memo.type}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Sent: {format(new Date(memo.created_at), 'PPp')}
                                          {memo.replies_count > 0 && (
                                            <>
                                              {' • '}
                                              {memo.replies_count} {memo.replies_count === 1 ? 'reply' : 'replies'}
                                              {memo.latest_reply_at && (
                                                <> • Last reply: {format(new Date(memo.latest_reply_at), 'PPp')}</>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
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
      {selectedEmployee && (
        <SendMemoDialog
          preSelectedEmployeeId={selectedEmployee}
          defaultType="reminder"
          onClose={() => {
            setSelectedEmployee(null);
            fetchMemoStats();
            toast.success('Reminder sent successfully');
          }}
        />
      )}
    </div>
  );
}
