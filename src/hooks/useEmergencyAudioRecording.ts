import { useEffect, useRef, useCallback, useState } from 'react';
import { useAudioRecording } from './useAudioRecording';
import { useEmergency } from '@/contexts/EmergencyContext';
import { toast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Automatically records 20 seconds of audio when an emergency is triggered,
 * then sends it as a message to the emergency chat.
 */
export const useEmergencyAudioRecording = () => {
  const { isEmergencyActive, currentChat } = useEmergency();
  const { user, userProfile } = useAuth();
  const { startRecording, micPermission, checkMicPermission, isRecording } = useAudioRecording();
  const hasRecordedRef = useRef(false);
  const prevEmergencyRef = useRef(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Check mic permission on mount
  useEffect(() => {
    checkMicPermission();
  }, [checkMicPermission]);

  const recordAndSend = useCallback(async (chatId: string) => {
    if (hasRecordedRef.current) return;
    hasRecordedRef.current = true;

    // Check permission state
    const perm = await checkMicPermission();
    if (perm === 'denied') {
      toast({
        title: "Audio Evidence Unavailable",
        description: "Microphone permission was denied. Audio evidence will not be available for this emergency.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "🎙️ Recording Audio Evidence",
        description: "Recording 20 seconds of audio for safety purposes...",
      });

      // Start countdown
      setCountdown(20);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const result = await startRecording(20000);
      
      // Clear countdown
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);

      if (result && user && userProfile) {
        // Convert blob to base64 for storage in Firestore message
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          // Send audio as a chat message
          await addDoc(collection(db, 'messages'), {
            chatId: chatId,
            senderId: user.uid,
            senderName: userProfile.displayName || 'User',
            senderEmail: userProfile.email || null,
            senderPhone: userProfile.phone || null,
            text: '🎙️ [Emergency Audio Evidence - 20 sec recording]',
            audioData: base64Audio,
            audioDuration: 20,
            timestamp: serverTimestamp(),
            type: 'audio',
          });

          toast({
            title: "✅ Audio Sent",
            description: "Emergency audio evidence has been sent to the chat.",
          });
        };
        reader.readAsDataURL(result.blob);
      }
    } catch (err) {
      console.error('Emergency audio recording failed:', err);
      toast({
        title: "Audio Recording Failed",
        description: "Could not record audio. Other emergency features are still active.",
        variant: "destructive",
      });
    }
  }, [startRecording, checkMicPermission, user, userProfile]);

  // Trigger recording when emergency becomes active and chat is available
  useEffect(() => {
    // Track if emergency just activated
    if (isEmergencyActive && !prevEmergencyRef.current) {
      // Emergency just activated, mark it but don't reset hasRecordedRef
      prevEmergencyRef.current = true;
    }

    // Record when emergency is active, chat is available, and we haven't recorded yet
    if (isEmergencyActive && currentChat?.id && !hasRecordedRef.current) {
      recordAndSend(currentChat.id);
    }

    // Reset when emergency ends
    if (!isEmergencyActive) {
      prevEmergencyRef.current = false;
      hasRecordedRef.current = false;
    }
  }, [isEmergencyActive, currentChat, recordAndSend]);

  return { isRecording, countdown };
};
