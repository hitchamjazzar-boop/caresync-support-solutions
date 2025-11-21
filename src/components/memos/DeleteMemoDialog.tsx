import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface DeleteMemoDialogProps {
  memoId: string;
  memoTitle: string;
  onDeleted: () => void;
}

export function DeleteMemoDialog({ memoId, memoTitle, onDeleted }: DeleteMemoDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', memoId);

      if (error) throw error;

      toast.success('Memo deleted successfully');
      setOpen(false);
      onDeleted();
    } catch (error: any) {
      console.error('Error deleting memo:', error);
      toast.error('Failed to delete memo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Memo</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this memo?
            <div className="mt-2 p-2 bg-muted rounded-md">
              <span className="font-medium">{memoTitle}</span>
            </div>
            <p className="mt-2 text-destructive">
              This action cannot be undone. The memo and all its replies will be permanently deleted.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Memo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
