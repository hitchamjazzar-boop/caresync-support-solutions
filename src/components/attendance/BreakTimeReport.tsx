import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Coffee, User, Timer, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const BREAK_TYPES = {
  lunch: { label: 'Lunch', icon: Coffee, color: 'text-orange-500' },
  coffee: { label: 'Coffee', icon: Coffee, color: 'text-amber-600' },
  bathroom: { label: 'Bathroom', icon: User, color: 'text-blue-500' },
  personal: { label: 'Personal', icon: Timer, color: 'text-purple-500' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'text-muted-foreground' },
} as const;

interface BreakRecord {
  id: string;
  break_type: string;
  break_start: string;
  break_end: string | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
  profile: {
    full_name: string;
    photo_url: string | null;
  };
  breaks: BreakRecord[];
}

interface BreakTimeReportProps {
  records: AttendanceRecord[];
  loading: boolean;
}

// Lunch break has a separate 60-minute limit
const LUNCH_LIMIT_MINUTES = 60;
// Other breaks (coffee, bathroom, personal, other) share a 15-minute limit
const OTHER_BREAK_LIMIT_MINUTES = 15;
const OTHER_WARNING_MINUTES = 20;

export const BreakTimeReport = ({ records, loading }: BreakTimeReportProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const calculateBreakMinutes = (breaks: BreakRecord[], type: 'lunch' | 'other') => {
    return breaks
      .filter((brk) => (type === 'lunch' ? brk.break_type === 'lunch' : brk.break_type !== 'lunch'))
      .reduce((total, brk) => {
        if (brk.break_end) {
          const start = new Date(brk.break_start);
          const end = new Date(brk.break_end);
          return total + (end.getTime() - start.getTime()) / 1000 / 60;
        }
        return total;
      }, 0);
  };

  const calculateTotalBreakMinutes = (breaks: BreakRecord[]) => {
    return breaks.reduce((total, brk) => {
      if (brk.break_end) {
        const start = new Date(brk.break_start);
        const end = new Date(brk.break_end);
        return total + (end.getTime() - start.getTime()) / 1000 / 60;
      }
      return total;
    }, 0);
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (lunchMinutes: number, otherMinutes: number) => {
    const lunchOver = lunchMinutes > LUNCH_LIMIT_MINUTES;
    const otherOver = otherMinutes > OTHER_BREAK_LIMIT_MINUTES;
    const otherWarning = otherMinutes > OTHER_BREAK_LIMIT_MINUTES && otherMinutes <= OTHER_WARNING_MINUTES;

    if (lunchOver || otherOver) {
      return <Badge variant="destructive">Over Limit</Badge>;
    }
    if (otherWarning) {
      return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20">Warning</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">OK</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No attendance records found for the selected period.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Work Hours</TableHead>
            <TableHead>Lunch (60m max)</TableHead>
            <TableHead>Other Breaks (15m max)</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const lunchMinutes = calculateBreakMinutes(record.breaks, 'lunch');
            const otherMinutes = calculateBreakMinutes(record.breaks, 'other');
            const isExpanded = expandedRows.has(record.id);
            const hasBreaks = record.breaks.length > 0;

            return (
              <Collapsible key={record.id} asChild open={isExpanded} onOpenChange={() => toggleRow(record.id)}>
                <>
                  <TableRow className="group">
                    <TableCell>
                      {hasBreaks && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={record.profile.photo_url || undefined} />
                          <AvatarFallback>
                            {record.profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{record.profile.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.clock_in), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : record.status === 'active' ? 'In progress' : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={lunchMinutes > LUNCH_LIMIT_MINUTES ? 'text-destructive font-medium' : ''}>
                        {formatMinutes(lunchMinutes)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={otherMinutes > OTHER_BREAK_LIMIT_MINUTES ? 'text-destructive font-medium' : ''}>
                        {formatMinutes(otherMinutes)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(lunchMinutes, otherMinutes)}</TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={7} className="p-0">
                        <div className="px-10 py-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Break Details</p>
                          <div className="space-y-1.5">
                            {record.breaks.map((brk) => {
                              const breakInfo = BREAK_TYPES[brk.break_type as keyof typeof BREAK_TYPES] || BREAK_TYPES.other;
                              const Icon = breakInfo.icon;
                              const duration = brk.break_end
                                ? (new Date(brk.break_end).getTime() - new Date(brk.break_start).getTime()) / 1000 / 60
                                : 0;

                              return (
                                <div key={brk.id} className="flex items-center gap-3 text-sm">
                                  <Icon className={`h-4 w-4 ${breakInfo.color}`} />
                                  <span className="w-20">{breakInfo.label}</span>
                                  <span className="text-muted-foreground">
                                    {format(new Date(brk.break_start), 'h:mm a')}
                                    {brk.break_end && (
                                      <> - {format(new Date(brk.break_end), 'h:mm a')}</>
                                    )}
                                  </span>
                                  {brk.break_end && (
                                    <Badge variant="outline" className="ml-auto">
                                      {Math.round(duration)}m
                                    </Badge>
                                  )}
                                  {!brk.break_end && (
                                    <Badge variant="secondary" className="ml-auto animate-pulse">
                                      Ongoing
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
