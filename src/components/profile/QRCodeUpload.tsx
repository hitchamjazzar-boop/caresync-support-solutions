import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, QrCode, X, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const QRCodeUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQRCode();
    }
  }, [user]);

  const fetchQRCode = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('qr_code_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setQrCodeUrl(data?.qr_code_url || null);
    } catch (error) {
      console.error('Error fetching QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Delete old QR code if exists
      if (qrCodeUrl) {
        const urlParts = qrCodeUrl.split('/profile-photos/');
        if (urlParts.length > 1) {
          const oldFilePath = urlParts[1].split('?')[0];
          await supabase.storage.from('profile-photos').remove([oldFilePath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      const newQrUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ qr_code_url: newQrUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setQrCodeUrl(newQrUrl);

      toast({
        title: 'Success',
        description: 'QR code uploaded successfully',
      });

      // Clear the file input
      const fileInput = document.getElementById('qr-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Error uploading QR code:', error);
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user || !qrCodeUrl) return;

    setUploading(true);

    try {
      // Delete from storage
      const urlParts = qrCodeUrl.split('/profile-photos/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage.from('profile-photos').remove([filePath]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ qr_code_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setQrCodeUrl(null);

      toast({
        title: 'Success',
        description: 'QR code removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing QR code:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Upload Your QR Code
          </CardTitle>
          <CardDescription>
            Upload your payment QR code (GCash, Maya, etc.) for easy transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeUrl ? (
            <div className="space-y-4">
              <div 
                className="relative mx-auto w-fit cursor-pointer group"
                onClick={() => setPreviewOpen(true)}
              >
                <img
                  src={qrCodeUrl}
                  alt="Your QR Code"
                  className="max-w-[200px] rounded-lg border border-border shadow-sm transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <ZoomIn className="h-8 w-8 text-foreground" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Click to preview
              </p>
              <div className="flex gap-2 justify-center">
                <Label htmlFor="qr-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Replace
                      </>
                    )}
                  </div>
                </Label>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                <QrCode className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div>
                <Label htmlFor="qr-upload" className="cursor-pointer">
                  <div className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload QR Code
                      </>
                    )}
                  </div>
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WEBP. Max 2MB.
              </p>
            </div>
          )}
          <Input
            id="qr-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Your QR Code</DialogTitle>
          </DialogHeader>
          {qrCodeUrl && (
            <div className="flex justify-center p-4">
              <img
                src={qrCodeUrl}
                alt="Your QR Code"
                className="max-w-full rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
