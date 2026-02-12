import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Monitor, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
        setLoading(false);
        return;
      }

      const captures = (data || []) as ScreenCapture[];
      setCaptures(captures);
      setLoading(false);

      if (captures.length === 0) return;

      // Generate signed URLs in parallel instead of sequentially
      const urlPromises = captures.map(async (capture) => {
        const { data: signedData } = await supabase.storage
          .from('screen-captures')
          .createSignedUrl(capture.image_url, 3600);
        return { id: capture.id, url: signedData?.signedUrl };
      });

      const results = await Promise.all(urlPromises);
      const urls: Record<string, string> = {};
      for (const r of results) {
        if (r.url) urls[r.id] = r.url;
      }
      setImageUrls(urls);
    };

    fetchCaptures();
  }, [open, attendanceId]);

  useEffect(() => {
    if (!open) setSelectedIndex(null);
  }, [open]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const selectedCapture = selectedIndex !== null ? captures[selectedIndex] : null;

  return (
    <>
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
                {captures.map((capture, index) => (
                  <div key={capture.id} className="space-y-1.5">
                    <div
                      className="rounded-lg border overflow-hidden bg-muted/30 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => setSelectedIndex(index)}
                    >
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

      {/* Fullscreen lightbox */}
      {selectedIndex !== null && selectedCapture && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); }}
          >
            <X className="h-6 w-6" />
          </Button>

          {selectedIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 text-white hover:bg-white/20 z-10"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {selectedIndex < captures.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-16 text-white hover:bg-white/20 z-10"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {imageUrls[selectedCapture.id] ? (
              <img
                src={imageUrls[selectedCapture.id]}
                alt={`Capture at ${formatTime(selectedCapture.captured_at)}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            ) : (
              <div className="text-white">Loading...</div>
            )}
            <p className="text-sm text-white/70">
              {formatTime(selectedCapture.captured_at)} — {selectedIndex + 1} of {captures.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
};