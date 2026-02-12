import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CAPTURE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UseScreenCaptureOptions {
  stream: MediaStream | null;
  attendanceId: string | null;
  userId: string | null;
  isOnBreak: boolean;
}

export const useScreenCapture = ({ stream, attendanceId, userId, isOnBreak }: UseScreenCaptureOptions) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const captureAndUpload = useCallback(async () => {
    if (!stream || !attendanceId || !userId || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      });

      if (!blob) return;

      const timestamp = new Date().toISOString();
      const fileName = `${userId}/${attendanceId}/${timestamp.replace(/[:.]/g, '-')}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('screen-captures')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('Failed to upload screen capture:', uploadError);
        return;
      }

      const { error: insertError } = await (supabase as any)
        .from('screen_captures')
        .insert({
          attendance_id: attendanceId,
          user_id: userId,
          image_url: fileName,
          captured_at: timestamp,
        });

      if (insertError) {
        console.error('Failed to insert screen capture record:', insertError);
      }
    } catch (err) {
      console.error('Screen capture error:', err);
    }
  }, [stream, attendanceId, userId]);

  // Set up video element with the stream
  useEffect(() => {
    if (!stream) return;

    if (!videoRef.current) {
      videoRef.current = document.createElement('video');
      videoRef.current.setAttribute('autoplay', '');
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.muted = true;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(console.error);

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Manage capture interval
  useEffect(() => {
    if (!stream || !attendanceId || !userId || isOnBreak) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Capture immediately on start
    captureAndUpload();

    intervalRef.current = setInterval(captureAndUpload, CAPTURE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stream, attendanceId, userId, isOnBreak, captureAndUpload]);

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  return { stopCapture, captureAndUpload };
};
