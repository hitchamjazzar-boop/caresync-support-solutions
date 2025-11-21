import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, Play, AlertCircle, CheckCircle } from 'lucide-react';

export function EscalationStatus() {
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<{
    escalated: number;
    total_checked: number;
    timestamp: string;
  } | null>(null);

  const runEscalationCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('escalate-memos', {
        body: { manual: true },
      });

      if (error) throw error;

      setLastRun(data);
      
      if (data.escalated > 0) {
        toast.success(`Successfully escalated ${data.escalated} memo(s)`);
      } else {
        toast.info('No memos needed escalation at this time');
      }
    } catch (error: any) {
      console.error('Error running escalation check:', error);
      toast.error('Failed to run escalation check: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Auto-Escalation Status
            </CardTitle>
            <CardDescription>
              Automatically sends reminders for unread memos
            </CardDescription>
          </div>
          <Button
            onClick={runEscalationCheck}
            disabled={loading}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Running...' : 'Run Check Now'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <CheckCircle className="h-3 w-3 mr-1" />
            Scheduled: Every Hour
          </Badge>
        </div>

        {lastRun && (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Manual Check</span>
              <span className="text-xs text-muted-foreground">
                {new Date(lastRun.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Checked:</span>{' '}
                <span className="font-medium">{lastRun.total_checked} memos</span>
              </div>
              <div>
                <span className="text-muted-foreground">Escalated:</span>{' '}
                <span className="font-medium">{lastRun.escalated} memos</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>The escalation system automatically checks for unread memos every hour.</p>
              <p>When a memo exceeds its escalation time, a reminder is sent to the employee.</p>
              <p>You can run a manual check anytime using the button above.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
