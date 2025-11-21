import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnnouncementDialog } from '@/components/announcements/AnnouncementDialog';
import { DeleteAnnouncementDialog } from '@/components/announcements/DeleteAnnouncementDialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
  is_pinned: boolean;
  target_type: string;
  target_users: string[] | null;
  target_roles: string[] | null;
  target_departments: string[] | null;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();

    // Set up realtime subscription
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDialogOpen(true);
  };

  const handleDelete = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedAnnouncement(null);
    setDialogOpen(true);
  };

  const getStatusBadge = (announcement: Announcement) => {
    if (announcement.is_pinned) {
      return <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">📌 Pinned</Badge>;
    }
    if (!announcement.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (announcement.expires_at) {
      const expiresAt = new Date(announcement.expires_at);
      const now = new Date();
      if (expiresAt < now) {
        return <Badge variant="destructive">Expired</Badge>;
      }
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilExpiry < 24) {
        return <Badge variant="destructive">Expires Soon</Badge>;
      }
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Announcements</h1>
        <Button onClick={handleCreateNew} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Announcement
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No announcements yet. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                  <div className="space-y-1 flex-1 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base sm:text-lg break-words">{announcement.title}</CardTitle>
                      {getStatusBadge(announcement)}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Created {format(new Date(announcement.created_at), 'PP')}
                      {announcement.expires_at && (
                        <span className="block sm:inline">
                          <span className="hidden sm:inline"> • </span>
                          Expires {format(new Date(announcement.expires_at), 'PP')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => handleEdit(announcement)}
                    >
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => handleDelete(announcement)}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <p className="text-sm sm:text-base text-foreground whitespace-pre-wrap break-words">{announcement.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AnnouncementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        announcement={selectedAnnouncement}
        onSuccess={fetchAnnouncements}
      />

      <DeleteAnnouncementDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        announcement={selectedAnnouncement}
        onSuccess={fetchAnnouncements}
      />
    </div>
  );
}
