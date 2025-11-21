import { useEffect, useState } from 'react';
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
  user_id: z.string().min(1, 'Please select an employee'),
  parent_id: z.string().optional(),
  position_order: z.number().min(0),
});

type FormData = z.infer<typeof formSchema>;

interface Profile {
  id: string;
  full_name: string;
  position: string | null;
}

interface OrgChartNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  hierarchy_level: number;
  profiles: {
    full_name: string;
  };
}

interface AddToOrgChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingNodes: OrgChartNode[];
}

export function AddToOrgChartDialog({
  open,
  onOpenChange,
  onSuccess,
  existingNodes,
}: AddToOrgChartDialogProps) {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user_id: '',
      parent_id: undefined,
      position_order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      fetchEmployees();
      form.reset();
    }
  }, [open]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, position')
        .order('full_name');

      if (error) throw error;

      // Filter out employees already in org chart
      const existingUserIds = existingNodes.map(node => node.user_id);
      const availableEmployees = (data || []).filter(
        emp => !existingUserIds.includes(emp.id)
      );
      
      setEmployees(availableEmployees);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Calculate hierarchy level based on parent
      let hierarchyLevel = 0;
      if (data.parent_id) {
        const parent = existingNodes.find(n => n.id === data.parent_id);
        hierarchyLevel = parent ? parent.hierarchy_level + 1 : 0;
      }

      const { error } = await supabase
        .from('org_chart')
        .insert([{
          user_id: data.user_id,
          parent_id: data.parent_id || null,
          hierarchy_level: hierarchyLevel,
          position_order: data.position_order,
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Employee added to org chart',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Org Chart</DialogTitle>
          <DialogDescription>
            Add an employee to the organizational chart and set their reporting relationship.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name} {employee.position && `(${employee.position})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reports To (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager (or leave empty for top level)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No manager (Top level)</SelectItem>
                      {existingNodes.map((node) => (
                        <SelectItem key={node.id} value={node.id}>
                          {node.profiles.full_name}
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
              <Button type="submit">Add to Chart</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
