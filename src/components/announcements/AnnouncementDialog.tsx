import { useEffect, useState, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImagePlus, X, Loader2 } from 'lucide-react';

const ANNOUNCEMENT_TEMPLATES = [
  // General Templates
  {
    id: 'holiday',
    name: '🎉 Holiday Announcement',
    title: 'Holiday Notice',
    content: 'Please be informed that our office will be closed on [DATE] in observance of [HOLIDAY NAME]. Regular operations will resume on [RETURN DATE]. For urgent matters, please contact [EMERGENCY CONTACT].',
  },
  {
    id: 'meeting',
    name: '📅 Meeting Announcement',
    title: 'Team Meeting',
    content: 'There will be a [TYPE] meeting scheduled for [DATE] at [TIME] in [LOCATION/PLATFORM]. Agenda: [AGENDA ITEMS]. Please confirm your attendance.',
  },
  {
    id: 'policy',
    name: '📋 Policy Update',
    title: 'Policy Update',
    content: 'We are updating our [POLICY NAME] effective [DATE]. Key changes include: [LIST CHANGES]. Please review the full policy document in [LOCATION]. Contact HR for questions.',
  },
  {
    id: 'system',
    name: '🔧 System Maintenance',
    title: 'System Maintenance Notice',
    content: 'Scheduled system maintenance on [DATE] from [START TIME] to [END TIME]. Services may be temporarily unavailable. Please save your work and log out before maintenance begins.',
  },
  // Team Wins / Milestones
  {
    id: 'team_win',
    name: '🏆 Team Win / Milestone',
    title: 'Exciting Team Achievement!',
    content: "Along with this great news, we're excited to share that our team has reached a new milestone! [DESCRIBE MILESTONE - e.g., We've closed a new client partnership this week! / We hit our lead generation target for the month! / Our service satisfaction rating increased again! / We completed a major project ahead of schedule!]",
  },
  {
    id: 'new_client',
    name: '🤝 New Client Partnership',
    title: 'New Client Partnership Announcement',
    content: "We're thrilled to announce that we have successfully onboarded [CLIENT NAME] as our newest client! This partnership represents [SIGNIFICANCE]. Thank you to everyone who contributed to making this happen!",
  },
  // Individual or Team Awards
  {
    id: 'employee_award',
    name: '⭐ Employee Award',
    title: 'Employee Recognition Award',
    content: 'We are pleased to announce that [EMPLOYEE NAME] has been selected as [AWARD NAME - e.g., Employee of the Month / Top Lead Generator / Outstanding Teamwork Award / Creativity & Innovation Award / Reliability & Consistency Award]! Congratulations on this well-deserved recognition!',
  },
  {
    id: 'awards_launch',
    name: '🎖️ Awards Program Launch',
    title: 'Introducing CareSync Awards!',
    content: 'We will be launching monthly CareSync Awards to celebrate top performers and recognize exceptional contributions across the team. Categories include: Employee of the Month, Top Lead Generator, Outstanding Teamwork, Creativity & Innovation, and Reliability & Consistency. Stay tuned for nominations!',
  },
  // Bonuses / Incentives
  {
    id: 'bonus_program',
    name: '💰 Bonus / Incentive Program',
    title: 'New Incentive Program Announcement',
    content: 'Starting this [QUARTER/MONTH], we will be introducing a [TYPE - e.g., monthly performance challenge / quarterly bonus program / attendance bonus / referral bonus] with exciting incentives for top contributors! More details to follow.',
  },
  {
    id: 'performance_incentive',
    name: '🎯 Performance Challenge',
    title: 'Performance Challenge with Rewards!',
    content: 'Get ready for our new Performance Challenge! [DESCRIBE CHALLENGE]. Top performers will receive [REWARDS]. Challenge period: [START DATE] to [END DATE]. Let the competition begin!',
  },
  // Upcoming Projects or Opportunities
  {
    id: 'new_project',
    name: '🚀 New Project Launch',
    title: 'Exciting New Project Announcement',
    content: "We have new projects launching soon, giving everyone more opportunities to grow and showcase their skills! [PROJECT DETAILS]. If you're interested in being part of this initiative, please reach out to [CONTACT].",
  },
  {
    id: 'training_program',
    name: '📚 Training / Development',
    title: 'New Training Program Available',
    content: 'We are excited to announce a new [TRAINING NAME] program starting [DATE]. This initiative will help you develop [SKILLS]. Sign up by [DEADLINE] to secure your spot!',
  },
  {
    id: 'leadership_opportunity',
    name: '👔 Leadership Opportunity',
    title: 'Leadership Opportunity Available',
    content: 'We are looking for team members interested in [LEADERSHIP ROLE/OPPORTUNITY]. This is a great chance to grow your career and take on new responsibilities. Interested? Apply by [DEADLINE].',
  },
  // Team Culture Boosters
  {
    id: 'team_event',
    name: '🎮 Team Event / Hangout',
    title: 'Team Building Event!',
    content: "To build our team culture, we'll be hosting [EVENT TYPE - e.g., monthly virtual hangout / game night / team quiz / wellness Friday] on [DATE] at [TIME]. Join us for games, fun, and team bonding! Everyone is welcome!",
  },
  {
    id: 'huddle_day',
    name: '🤗 CareSync Huddle Day',
    title: 'CareSync Huddle Day Announcement',
    content: "To build our team culture, we'll be introducing monthly CareSync Huddle Days with games, raffles, and team highlights! Our first Huddle Day is scheduled for [DATE]. Mark your calendars!",
  },
  {
    id: 'birthday_shoutout',
    name: '🎂 Birthday Celebration',
    title: 'Birthday Celebration!',
    content: "Let's celebrate [EMPLOYEE NAME]'s birthday! 🎉 Please join us in wishing them a wonderful day filled with joy and happiness. Happy Birthday!",
  },
  {
    id: 'wellness_initiative',
    name: '💚 Wellness Initiative',
    title: 'Wellness Initiative Announcement',
    content: "We're launching a new wellness initiative: [INITIATIVE NAME - e.g., Wellness Fridays / Mental Health Days / Fitness Challenge]. [DETAILS]. Your well-being matters to us!",
  },
  {
    id: 'surprise_raffle',
    name: '🎁 Surprise Raffle',
    title: 'Surprise Raffle Time!',
    content: "Surprise! We're holding a special raffle for our amazing team. [PRIZE DETAILS]. To enter: [HOW TO ENTER]. Winners will be announced on [DATE]. Good luck everyone!",
  },
  // General Celebration
  {
    id: 'celebration',
    name: '🎊 General Celebration',
    title: 'Congratulations Team!',
    content: 'We are pleased to announce [ACHIEVEMENT/MILESTONE]. Special recognition to [NAMES/TEAMS]. Thank you for your dedication and hard work!',
  },
];

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
    image_url?: string | null;
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setImagePreview(announcement.image_url || null);
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
      setImagePreview(null);
      setImageFile(null);
    }
  }, [announcement, form]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image under 5MB',
          variant: 'destructive',
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('announcement-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('announcement-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = ANNOUNCEMENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      form.setValue('title', template.title);
      form.setValue('content', template.content);
    }
  };

  const onSubmit = async (data: AnnouncementFormData) => {
    try {
      setIsUploading(true);
      
      // Upload image if there's a new file
      let imageUrl = imagePreview;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }
      
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
        image_url: imageUrl,
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
      setImageFile(null);
      setImagePreview(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
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
            {!isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Use Template (Optional)</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNOUNCEMENT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            {/* Image Upload */}
            <div className="space-y-2">
              <FormLabel>Image (Optional)</FormLabel>
              <div className="flex flex-col gap-3">
                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  >
                    <ImagePlus className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload an image</span>
                    <span className="text-xs text-muted-foreground/70">Max 5MB</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>
            </div>

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
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  isEditing ? 'Update' : 'Create'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
