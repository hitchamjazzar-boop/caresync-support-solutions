import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AssignmentViewerProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignmentViewer({ eventId, open, onOpenChange }: AssignmentViewerProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadAssignments();
    }
  }, [open, eventId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('secret_santa_assignments')
        .select(`
          *,
          giver:profiles!secret_santa_assignments_giver_id_fkey(*),
          receiver:profiles!secret_santa_assignments_receiver_id_fkey(*)
        `)
        .eq('event_id', eventId)
        .order('giver_id');

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Secret Santa Pairings</DialogTitle>
          <DialogDescription>
            Complete list of who is giving a gift to whom
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No assignments generated yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gift Giver</TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Gift Receiver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => {
                const giver = assignment.giver;
                const receiver = assignment.receiver;
                
                const giverInitials = giver?.full_name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase() || '?';
                
                const receiverInitials = receiver?.full_name
                  ?.split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase() || '?';

                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={giver?.photo_url} />
                          <AvatarFallback className="text-xs">{giverInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{giver?.full_name}</p>
                          {giver?.department && (
                            <p className="text-xs text-muted-foreground">
                              {giver.department}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={receiver?.photo_url} />
                          <AvatarFallback className="text-xs">{receiverInitials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{receiver?.full_name}</p>
                          {receiver?.department && (
                            <p className="text-xs text-muted-foreground">
                              {receiver.department}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
