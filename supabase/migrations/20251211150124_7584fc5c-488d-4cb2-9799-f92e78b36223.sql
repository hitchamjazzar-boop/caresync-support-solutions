-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload announcement images
CREATE POLICY "Admins can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'announcement-images' 
  AND has_role(auth.uid(), 'admin')
);

-- Allow anyone to view announcement images
CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcement-images');

-- Allow admins to delete announcement images
CREATE POLICY "Admins can delete announcement images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'announcement-images' 
  AND has_role(auth.uid(), 'admin')
);