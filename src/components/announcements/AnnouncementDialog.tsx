import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AnnouncementTargetingFields } from './AnnouncementTargetingFields';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  expires_at: z.string().optional(),
  is_active: z.boolean().default(true),
  is_pinned: z.boolean().default(false),
  target_type: z.enum(['all', 'specific_users', 'roles', 'departments']).default('all'),
  target_users: z.array(z.string()).optional(),
  target_roles: z.array(z.string()).optional(),
  target_departments: z.array(z.string()).optional(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

interface AnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: {
    id: string;
    title: string;
    content: string;
    expires_at: string | null;
    is_active: boolean;
    is_pinned: boolean;
    target_type: string;
    target_users: string[] | null;
    target_roles: string[] | null;
    target_departments: string[] | null;
  } | null;
  onSuccess: () => void;
}

export function AnnouncementDialog({
  open,
  onOpenChange,
  announcement,
  onSuccess,
}: AnnouncementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!announcement;
  const [employees, setEmployees] = useState<{ id: string; full_name: string; department: string | null }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchEmployeesAndDepartments();
  }, []);

  const fetchEmployeesAndDepartments = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, department')
      .order('full_name');
    
    if (data) {
      setEmployees(data);
      const uniqueDepts = Array.from(new Set(data.map(e => e.department).filter(Boolean))) as string[];
      setDepartments(uniqueDepts);
    }
  };

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
      expires_at: '',
      is_active: true,
      is_pinned: false,
      target_type: 'all',
      target_users: [],
      target_roles: [],
      target_departments: [],
    },
  });

  useEffect(() => {
    if (announcement) {
      form.reset({
        title: announcement.title,
        content: announcement.content,
        expires_at: announcement.expires_at 
          ? new Date(announcement.expires_at).toISOString().slice(0, 16) 
          : '',
        is_active: announcement.is_active,
        is_pinned: announcement.is_pinned,
        target_type: announcement.target_type as any,
        target_users: announcement.target_users || [],
        target_roles: announcement.target_roles || [],
        target_departments: announcement.target_departments || [],
      });
    } else {
      form.reset({
        title: '',
        content: '',
        expires_at: '',
        is_active: true,
        is_pinned: false,
        target_type: 'all',
        target_users: [],
        target_roles: [],
        target_departments: [],
      });
    }
  }, [announcement, form]);

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      const updateData = {
        title: data.title.trim(),
        content: data.content.trim(),
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        is_active: data.is_active,
        is_pinned: data.is_pinned,
        target_type: data.target_type,
        target_users: data.target_type === 'specific_users' ? data.target_users : null,
        target_roles: data.target_type === 'roles' ? data.target_roles : null,
        target_departments: data.target_type === 'departments' ? data.target_departments : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('announcements')
          .update(updateData)
          .eq('id', announcement.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Announcement updated successfully',
        });
      } else {
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        const { error } = await supabase
          .from('announcements')
          .insert([{
            ...updateData,
            created_by: user.id,
          }]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Announcement created successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Announcement' : 'Create Announcement'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the announcement details below.'
              : 'Create a new announcement to display on all dashboards.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Announcement title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Announcement content"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date & Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for announcements that never expire
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive announcements won't be displayed
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_pinned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">📌 Pin Announcement</FormLabel>
                    <FormDescription>
                      Pinned announcements stay at top and require acknowledgment
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <AnnouncementTargetingFields
              control={form.control}
              watch={form.watch}
              employees={employees}
              departments={departments}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
