import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Monitor } from 'lucide-react';

interface ScreenCapture {
  id: string;
  image_url: string;
  captured_at: string;
}

interface ScreenCaptureViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string;
  employeeName: string;
}

export const ScreenCaptureViewer = ({
  open,
  onOpenChange,
  attendanceId,
  employeeName,
}: ScreenCaptureViewerProps) => {
  const [captures, setCaptures] = useState<ScreenCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !attendanceId) return;

    const fetchCaptures = async () => {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('screen_captures')
        .select('id, image_url, captured_at')
        .eq('attendance_id', attendanceId)
        .order('captured_at', { ascending: true });

      if (error) {
        console.error('Error fetching screen captures:', error);
        setCaptures([]);
      } else {
        const captures = (data || []) as ScreenCapture[];
        setCaptures(captures);

        // Generate signed URLs for each capture
        const urls: Record<string, string> = {};
        for (const capture of captures) {
          const { data: signedData } = await supabase.storage
            .from('screen-captures')
            .createSignedUrl(capture.image_url, 3600);
          if (signedData?.signedUrl) {
            urls[capture.id] = signedData.signedUrl;
          }
        }
        setImageUrls(urls);
      }

      setLoading(false);
    };

    fetchCaptures();
  }, [open, attendanceId]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Screen Activity — {employeeName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : captures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No screen captures for this session</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-1">
              {captures.map((capture) => (
                <div key={capture.id} className="space-y-1.5">
                  <div className="rounded-lg border overflow-hidden bg-muted/30">
                    {imageUrls[capture.id] ? (
                      <img
                        src={imageUrls[capture.id]}
                        alt={`Capture at ${formatTime(capture.captured_at)}`}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                    ) : (
                      <div className="aspect-video flex items-center justify-center text-muted-foreground text-sm">
                        Loading...
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {formatTime(capture.captured_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
