import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Bell, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Memo {
  id: string;
  sender_id: string;
  type: 'memo' | 'reminder' | 'warning';
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export function MemoAlert() {
  const { user } = useAuth();
  const [memos, setMemos] = useState<Memo[]>([]);

  useEffect(() => {
    if (!user) return;

    fetchMemos();

    // Set up realtime subscription
    const channel = supabase
      .channel('memos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memos',
          filter: `recipient_id=eq.${user.id}`
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

  const fetchMemos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemos(data || []);
    } catch (error) {
      console.error('Error fetching memos:', error);
    }
  };

  const markAsRead = async (memoId: string) => {
    try {
      const { error } = await supabase
        .from('memos')
        .update({ is_read: true })
        .eq('id', memoId);

      if (error) throw error;
      
      // Update local state
      setMemos(prev => prev.filter(m => m.id !== memoId));
    } catch (error) {
      console.error('Error marking memo as read:', error);
    }
  };

  const getMemoIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'reminder':
        return <Bell className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getMemoStyles = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-red-500 bg-red-50 dark:bg-red-950/20 [&>svg]:text-red-600 dark:[&>svg]:text-red-400';
      case 'reminder':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️ WARNING';
      case 'reminder':
        return '🔔 REMINDER';
      default:
        return '📝 MEMO';
    }
  };

  if (memos.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {memos.map((memo) => (
        <Alert
          key={memo.id}
          className={cn(
            'relative border-2 animate-in fade-in slide-in-from-top-2 duration-500',
            getMemoStyles(memo.type)
          )}
        >
          {getMemoIcon(memo.type)}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <AlertTitle className="text-base font-bold mb-1">
                {getTypeLabel(memo.type)} - {memo.title}
              </AlertTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1"
                onClick={() => markAsRead(memo.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDescription className="text-sm space-y-1">
              <p className="whitespace-pre-wrap">{memo.content}</p>
              <p className="text-xs opacity-70 mt-2">
                Sent {format(new Date(memo.created_at), 'PPp')}
              </p>
            </AlertDescription>
          </div>
        </Alert>
      ))}
    </div>
  );
}
