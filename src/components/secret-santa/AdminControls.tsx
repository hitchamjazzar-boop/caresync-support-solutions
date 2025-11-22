import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, Plus, Shuffle, CheckCircle, Eye, EyeOff, Table } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { AssignmentViewer } from './AssignmentViewer';

interface AdminControlsProps {
  event?: any;
  onEventCreated?: () => void;
  onEventUpdated?: () => void;
}

export function AdminControls({ event, onEventCreated, onEventUpdated }: AdminControlsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget_limit: '',
    start_date: '',
    end_date: '',
  });

  const handleCreateEvent = async () => {
    if (!user) return;

    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('secret_santa_events')
        .insert({
          name: formData.name,
          description: formData.description || null,
          budget_limit: formData.budget_limit ? parseFloat(formData.budget_limit) : null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          created_by: user.id,
          status: 'open',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Secret Santa event created successfully',
      });

      setDialogOpen(false);
      setFormData({ name: '', description: '', budget_limit: '', start_date: '', end_date: '' });
      onEventCreated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleGenerateAssignments = async () => {
    if (!event) return;

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('assign-secret-santa', {
        body: { eventId: event.id },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Success',
        description: 'Secret Santa assignments generated successfully!',
      });
      onEventUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate assignments',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleReveal = async () => {
    if (!event) return;

    try {
      const { error } = await supabase
        .from('secret_santa_events')
        .update({ reveal_enabled: !event.reveal_enabled })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: event.reveal_enabled
          ? 'Assignments hidden from participants'
          : 'Assignments revealed to participants',
      });
      onEventUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCompleteEvent = async () => {
    if (!event) return;

    setCompleting(true);
    try {
      const { error } = await supabase
        .from('secret_santa_events')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Secret Santa event marked as completed',
      });
      onEventUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Controls
          </CardTitle>
          <CardDescription>
            Manage Secret Santa event and assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!event ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Secret Santa Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Secret Santa Event</DialogTitle>
                  <DialogDescription>
                    Set up a new Secret Santa gift exchange event
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Event Name *</Label>
                    <Input
                      placeholder="e.g., Christmas 2024 Secret Santa"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Brief description of the event"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Budget Limit (optional)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 50"
                      value={formData.budget_limit}
                      onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Exchange Date *</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEvent}>Create Event</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="space-y-3">
              {event.status === 'open' && (
                <Button 
                  onClick={handleGenerateAssignments}
                  disabled={generating}
                  className="w-full"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  {generating ? 'Generating...' : 'Generate Assignments'}
                </Button>
              )}

              {event.status === 'assigned' && (
                <>
                  <Button 
                    onClick={handleToggleReveal}
                    variant="outline"
                    className="w-full"
                  >
                    {event.reveal_enabled ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Assignments
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Reveal Assignments
                      </>
                    )}
                  </Button>

                  <Button 
                    onClick={() => setViewerOpen(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Table className="h-4 w-4 mr-2" />
                    View All Pairings
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="default"
                        className="w-full"
                        disabled={completing}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {completing ? 'Completing...' : 'Complete Event'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Complete Secret Santa Event?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark the event as completed and hide it from all users. 
                          You can create a new event afterwards. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCompleteEvent}>
                          Complete Event
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {event && (
        <AssignmentViewer 
          eventId={event.id}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
        />
      )}
    </>
  );
}
