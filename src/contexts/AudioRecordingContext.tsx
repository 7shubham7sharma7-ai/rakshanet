import React, { createContext, useContext } from 'react';
import { useEmergencyAudioRecording } from '@/hooks/useEmergencyAudioRecording';

interface AudioRecordingContextType {
  isRecording: boolean;
  countdown: number;
}

const AudioRecordingContext = createContext<AudioRecordingContextType>({
  isRecording: false,
  countdown: 0,
});

export const AudioRecordingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isRecording, countdown } = useEmergencyAudioRecording();
  
  return (
    <AudioRecordingContext.Provider value={{ isRecording, countdown }}>
      {children}
    </AudioRecordingContext.Provider>
  );
};

export const useAudioRecordingStatus = () => useContext(AudioRecordingContext);
