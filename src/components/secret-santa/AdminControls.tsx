import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Shuffle, CheckCircle, RefreshCw, Eye, Unlock } from 'lucide-react';
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
  const [assignmentsDialogOpen, setAssignmentsDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [enablingReveal, setEnablingReveal] = useState(false);
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

  const handleRegenerateAssignments = async () => {
    if (!event) return;

    setRegenerating(true);
    try {
      // First delete existing assignments
      const { error: deleteError } = await supabase
        .from('secret_santa_assignments')
        .delete()
        .eq('event_id', event.id);

      if (deleteError) throw deleteError;

      // Update event status back to open
      const { error: updateError } = await supabase
        .from('secret_santa_events')
        .update({ status: 'open', reveal_enabled: false })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // Generate new assignments
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await supabase.functions.invoke('assign-secret-santa', {
        body: { eventId: event.id },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Success',
        description: 'Assignments regenerated successfully!',
      });
      onEventUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate assignments',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleEnableReveal = async () => {
    if (!event) return;

    setEnablingReveal(true);
    try {
      const { error } = await supabase
        .from('secret_santa_events')
        .update({ reveal_enabled: true })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignments are now visible to all participants!',
      });
      onEventUpdated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setEnablingReveal(false);
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

  if (!event) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Secret Santa Event
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
    );
  }

  return (
    <div className="flex gap-2">
      {event.status === 'open' && (
        <Button 
          onClick={handleGenerateAssignments}
          disabled={generating}
        >
          <Shuffle className="h-4 w-4 mr-2" />
          {generating ? 'Generating...' : 'Generate Assignments'}
        </Button>
      )}

      {event.status === 'assigned' && (
        <>
          {!event.reveal_enabled && (
            <Button 
              onClick={handleEnableReveal}
              disabled={enablingReveal}
            >
              <Unlock className="h-4 w-4 mr-2" />
              {enablingReveal ? 'Enabling...' : 'Enable Reveal'}
            </Button>
          )}

          <Button 
            variant="outline"
            onClick={() => setAssignmentsDialogOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Assignments
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={regenerating}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate Assignments?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all current assignments and generate new ones. Everyone will get a different Secret Santa assignment.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegenerateAssignments}>
                  Regenerate
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={completing}>
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

          <AssignmentViewer 
            eventId={event.id}
            open={assignmentsDialogOpen}
            onOpenChange={setAssignmentsDialogOpen}
          />
        </>
      )}
    </div>
  );
}
