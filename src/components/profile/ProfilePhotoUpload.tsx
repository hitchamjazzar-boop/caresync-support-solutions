import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProfilePhotoUploadProps {
  userId: string;
  currentPhotoUrl: string | null;
  userName: string;
  onPhotoUpdated: () => void;
}

export const ProfilePhotoUpload = ({
  userId,
  currentPhotoUrl,
  userName,
  onPhotoUpdated,
}: ProfilePhotoUploadProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage with user folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Delete old photo if exists
      if (currentPhotoUrl) {
        const urlParts = currentPhotoUrl.split('/profile-photos/');
        if (urlParts.length > 1) {
          const oldFilePath = urlParts[1];
          await supabase.storage.from('profile-photos').remove([oldFilePath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Update profile with new photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: 'Photo Updated',
        description: 'Your profile photo has been updated successfully',
      });

      onPhotoUpdated();
    } catch (error: any) {
      console.error('Error updating photo:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to update photo. Please try again.',
        variant: 'destructive',
      });
      setPreview(currentPhotoUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className="h-32 w-32">
        <AvatarImage src={preview || undefined} />
        <AvatarFallback className="text-4xl">
          {userName?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="photo-upload" className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Change Photo
              </>
            )}
          </Button>
        </Label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Max size: 5MB. JPG, PNG, or GIF
        </p>
      </div>
    </div>
  );
};
