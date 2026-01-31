import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import { useEmergency } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export const EmergencyButton: React.FC = () => {
  const {
    isEmergencyActive,
    triggerSOS,
    isLoadingLocation,
    locationError,
    updateLocation,
  } = useEmergency();
  const { t } = useLanguage();
  const [isTriggering, setIsTriggering] = useState(false);

  const handleEmergencyPress = async () => {
    if (isTriggering || isEmergencyActive) return;
    
    setIsTriggering(true);
    
    try {
      // First, request location permission and get GPS coordinates
      await updateLocation();
      // Then trigger the SOS
      await triggerSOS('manual');
    } catch (error) {
      console.error('Emergency trigger failed:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Location Status */}
      <AnimatePresence>
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm"
          >
            <MapPin className="w-4 h-4" />
            <span>{locationError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Red Emergency Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative"
      >
        {/* Pulsing Glow Effect */}
        <div className={`
          absolute inset-0 rounded-2xl bg-destructive/30
          ${!isEmergencyActive && !isTriggering ? 'animate-pulse' : ''}
        `} />
        
        {/* Outer Ring */}
        <div className="absolute -inset-2 rounded-3xl border-4 border-destructive/20" />
        
        <Button
          onClick={handleEmergencyPress}
          disabled={isTriggering || isEmergencyActive}
          className={`
            relative w-64 h-32 rounded-2xl
            bg-destructive hover:bg-destructive/90
            text-destructive-foreground
            font-bold text-xl
            shadow-lg shadow-destructive/50
            transition-all duration-200
            flex flex-col items-center justify-center gap-2
            ${isEmergencyActive ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isTriggering || isLoadingLocation ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin" />
              <span className="text-base">Getting Location...</span>
            </>
          ) : isEmergencyActive ? (
            <>
              <AlertTriangle className="w-10 h-10" />
              <span>EMERGENCY ACTIVE</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-10 h-10" />
              <span>{t('emergency') || 'EMERGENCY'}</span>
              <span className="text-xs font-normal opacity-80">Press to send alert</span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center max-w-[280px]">
        {isEmergencyActive 
          ? "Emergency is active. Help is on the way."
          : "Press the emergency button to send your location to all emergency contacts"
        }
      </p>
    </div>
  );
};
