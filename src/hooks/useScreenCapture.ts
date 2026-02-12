import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CAPTURE_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

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
  const videoReadyRef = useRef(false);

  // Use refs for values needed in the interval callback to avoid dependency changes
  const streamRef = useRef(stream);
  const attendanceIdRef = useRef(attendanceId);
  const userIdRef = useRef(userId);

  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { attendanceIdRef.current = attendanceId; }, [attendanceId]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const captureAndUpload = useCallback(async () => {
    const currentStream = streamRef.current;
    const currentAttendanceId = attendanceIdRef.current;
    const currentUserId = userIdRef.current;

    if (!currentStream || !currentAttendanceId || !currentUserId || !videoRef.current || !canvasRef.current) {
      console.log('[ScreenCapture] Skipping capture - missing refs:', {
        stream: !!currentStream, attendanceId: currentAttendanceId, userId: currentUserId,
        video: !!videoRef.current, canvas: !!canvasRef.current
      });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('[ScreenCapture] Video not ready yet, dimensions are 0');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      });

      if (!blob) {
        console.error('[ScreenCapture] Failed to create blob from canvas');
        return;
      }

      const timestamp = new Date().toISOString();
      const fileName = `${currentUserId}/${currentAttendanceId}/${timestamp.replace(/[:.]/g, '-')}.jpg`;

      console.log('[ScreenCapture] Uploading capture:', fileName, 'size:', blob.size);

      const { error: uploadError } = await supabase.storage
        .from('screen-captures')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) {
        console.error('[ScreenCapture] Failed to upload:', uploadError);
        return;
      }

      const { error: insertError } = await (supabase as any)
        .from('screen_captures')
        .insert({
          attendance_id: currentAttendanceId,
          user_id: currentUserId,
          image_url: fileName,
          captured_at: timestamp,
        });

      if (insertError) {
        console.error('[ScreenCapture] Failed to insert record:', insertError);
      } else {
        console.log('[ScreenCapture] Capture saved successfully');
      }
    } catch (err) {
      console.error('[ScreenCapture] Capture error:', err);
    }
  }, []); // No dependencies - uses refs instead

  // Set up video element with the stream
  useEffect(() => {
    if (!stream) {
      videoReadyRef.current = false;
      return;
    }

    if (!videoRef.current) {
      videoRef.current = document.createElement('video');
      videoRef.current.setAttribute('autoplay', '');
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.muted = true;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const video = videoRef.current;
    video.srcObject = stream;
    videoReadyRef.current = false;

    const handleLoadedMetadata = () => {
      console.log('[ScreenCapture] Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
      videoReadyRef.current = true;
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.play().catch((err) => console.error('[ScreenCapture] Video play error:', err));

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      videoReadyRef.current = false;
    };
  }, [stream]);

  // Manage capture interval
  useEffect(() => {
    if (!stream || !attendanceId || !userId || isOnBreak) {
      if (intervalRef.current) {
        console.log('[ScreenCapture] Clearing interval - conditions not met:', {
          stream: !!stream, attendanceId, userId, isOnBreak
        });
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Wait for video to be ready before first capture
    const startCapturing = () => {
      console.log('[ScreenCapture] Starting capture interval (every', CAPTURE_INTERVAL_MS / 1000, 'seconds)');
      captureAndUpload();
      intervalRef.current = setInterval(() => {
        console.log('[ScreenCapture] Interval tick - capturing...');
        captureAndUpload();
      }, CAPTURE_INTERVAL_MS);
    };

    // Poll until video is ready (max 5 seconds)
    let attempts = 0;
    const maxAttempts = 50;
    const checkReady = setInterval(() => {
      attempts++;
      if (videoReadyRef.current) {
        clearInterval(checkReady);
        startCapturing();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkReady);
        console.warn('[ScreenCapture] Video never became ready, starting capture anyway');
        startCapturing();
      }
    }, 100);

    return () => {
      clearInterval(checkReady);
      if (intervalRef.current) {
        console.log('[ScreenCapture] Cleanup - clearing interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stream, attendanceId, userId, isOnBreak, captureAndUpload]);

  const pauseCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    pauseCapture();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    videoReadyRef.current = false;
  }, [stream, pauseCapture]);

  return { stopCapture, pauseCapture, captureAndUpload };
};
