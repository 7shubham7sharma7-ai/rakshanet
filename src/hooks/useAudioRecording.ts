import { useState, useRef, useCallback } from 'react';

export interface AudioRecordingResult {
  blob: Blob;
  url: string;
  duration: number;
}

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const checkMicPermission = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const state = result.state as 'granted' | 'denied' | 'prompt';
      setMicPermission(state);
      return state;
    } catch {
      // Fallback for browsers that don't support permissions API for microphone
      setMicPermission('unknown');
      return 'prompt';
    }
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed the permission
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
      return true;
    } catch {
      setMicPermission('denied');
      return false;
    }
  }, []);

  const startRecording = useCallback((durationMs: number = 20000): Promise<AudioRecordingResult | null> => {
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
            ? 'audio/webm;codecs=opus' 
            : 'audio/webm'
        });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          resolve({ blob, url, duration: durationMs / 1000 });
        };

        mediaRecorder.onerror = () => {
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          resolve(null);
        };

        mediaRecorder.start(1000); // collect data every second
        setIsRecording(true);

        // Auto-stop after duration
        timerRef.current = setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }, durationMs);
      } catch (err) {
        console.error('Failed to start audio recording:', err);
        setIsRecording(false);
        resolve(null);
      }
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return {
    isRecording,
    micPermission,
    checkMicPermission,
    requestMicPermission,
    startRecording,
    stopRecording,
  };
};
