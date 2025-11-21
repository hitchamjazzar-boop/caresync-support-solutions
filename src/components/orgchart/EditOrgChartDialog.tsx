import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  parent_id: z.string().optional(),
  position_order: z.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface OrgChartNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  position_order: number;
  hierarchy_level: number;
  profiles: {
    full_name: string;
  };
}

interface EditOrgChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: OrgChartNode | null;
  onSuccess: () => void;
  existingNodes: OrgChartNode[];
}

export function EditOrgChartDialog({
  open,
  onOpenChange,
  node,
  onSuccess,
  existingNodes,
}: EditOrgChartDialogProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      parent_id: undefined,
      position_order: 0,
    },
  });

  useEffect(() => {
    if (node && open) {
      form.reset({
        parent_id: node.parent_id || 'none',
        position_order: node.position_order,
      });
    }
  }, [node, open, form]);

  const onSubmit = async (data: FormData) => {
    if (!node) return;

    try {
      const parentId = data.parent_id === 'none' ? null : data.parent_id;
      
      // Calculate hierarchy level based on parent
      let hierarchyLevel = 0;
      if (parentId) {
        const parent = existingNodes.find(n => n.id === parentId);
        hierarchyLevel = parent ? parent.hierarchy_level + 1 : 0;
      }

      const { error } = await supabase
        .from('org_chart')
        .update({
          parent_id: parentId,
          hierarchy_level: hierarchyLevel,
          position_order: data.position_order,
        })
        .eq('id', node.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Org chart position updated',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Filter out the current node and its descendants from possible parents
  const getDescendants = (nodeId: string): string[] => {
    const descendants: string[] = [nodeId];
    const children = existingNodes.filter(n => n.parent_id === nodeId);
    children.forEach(child => {
      descendants.push(...getDescendants(child.id));
    });
    return descendants;
  };

  const availableParents = node
    ? existingNodes.filter(n => !getDescendants(node.id).includes(n.id))
    : existingNodes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Position</DialogTitle>
          <DialogDescription>
            Update {node?.profiles.full_name}'s position in the org chart.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reports To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No manager (Top level)</SelectItem>
                      {availableParents.map((parentNode) => (
                        <SelectItem key={parentNode.id} value={parentNode.id}>
                          {parentNode.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Who does this person report to?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="position_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Order among siblings (0 = first)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
