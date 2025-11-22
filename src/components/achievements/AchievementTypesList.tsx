import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Award, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AchievementType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  is_active: boolean;
}

interface AchievementTypesListProps {
  achievementTypes: AchievementType[];
  onUpdate: () => void;
}

export const AchievementTypesList = ({
  achievementTypes,
  onUpdate,
}: AchievementTypesListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setUpdating(id);
    try {
      const { error } = await supabase
        .from('achievement_types')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(
        `Achievement type ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      );
      onUpdate();
    } catch (error: any) {
      console.error('Error toggling achievement type:', error);
      toast.error('Failed to update achievement type');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;

    try {
      const { error } = await supabase
        .from('achievement_types')
        .delete()
        .eq('id', typeToDelete);

      if (error) throw error;

      toast.success('Achievement type deleted successfully');
      onUpdate();
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    } catch (error: any) {
      console.error('Error deleting achievement type:', error);
      toast.error('Failed to delete achievement type');
    }
  };

  if (achievementTypes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No achievement types yet. Create your first one!
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {achievementTypes.map((type) => (
          <Card key={type.id} className="p-4">
            <div className="flex items-start gap-4">
              <div
                className="p-3 rounded-lg shrink-0"
                style={{ backgroundColor: `${type.color}20` }}
              >
                <Award className="h-6 w-6" style={{ color: type.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{type.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {type.category}
                      </Badge>
                      <Badge
                        variant={type.is_active ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {type.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Active</span>
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() =>
                          handleToggleActive(type.id, type.is_active)
                        }
                        disabled={updating === type.id}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTypeToDelete(type.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Achievement Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this achievement type? This action cannot
              be undone. All achievements of this type will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTypeToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
