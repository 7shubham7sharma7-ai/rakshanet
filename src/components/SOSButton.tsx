import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MapPin } from 'lucide-react';
import { useEmergency } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';

export const SOSButton: React.FC = () => {
  const {
    isEmergencyActive,
    sosHoldProgress,
    setSosHoldProgress,
    setShowConfirmation,
    registerRapidTap,
    rapidTapCount,
    isLoadingLocation,
    updateLocation,
  } = useEmergency();
  const { t } = useLanguage();
  
  const holdTimerRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const isHoldingRef = useRef(false);
  const progressRef = useRef(0);

  const HOLD_DURATION = 3000; // 3 seconds
  const PROGRESS_INTERVAL = 50; // Update every 50ms

  const startHold = useCallback(async () => {
    // Allow SOS even if emergency is active (creates new emergency)
    if (isLoadingLocation) return;
    
    // Start getting location immediately when user starts holding
    updateLocation().catch(console.error);
    
    isHoldingRef.current = true;
    progressRef.current = 0;
    setSosHoldProgress(0);
    
    // Progress animation
    progressIntervalRef.current = setInterval(() => {
      progressRef.current = Math.min(progressRef.current + (PROGRESS_INTERVAL / HOLD_DURATION) * 100, 100);
      setSosHoldProgress(progressRef.current);
    }, PROGRESS_INTERVAL);
    
    // Complete hold
    holdTimerRef.current = setTimeout(() => {
      if (isHoldingRef.current) {
        setShowConfirmation(true);
        setSosHoldProgress(0);
        progressRef.current = 0;
        clearInterval(progressIntervalRef.current);
      }
    }, HOLD_DURATION);
  }, [isEmergencyActive, isLoadingLocation, setSosHoldProgress, setShowConfirmation, updateLocation]);

  const endHold = useCallback(() => {
    isHoldingRef.current = false;
    
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // If not completed, register as rapid tap
    if (sosHoldProgress < 100 && sosHoldProgress > 0) {
      registerRapidTap();
    }
    
    setSosHoldProgress(0);
  }, [sosHoldProgress, registerRapidTap, setSosHoldProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Calculate SVG circle properties
  const size = 260;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (sosHoldProgress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Rapid Tap Indicator */}
      <AnimatePresence>
        {rapidTapCount > 0 && rapidTapCount < 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-20 bg-warning/20 text-warning px-4 py-2 rounded-full text-sm font-medium"
          >
            {t('tapMore') || `Tap ${3 - rapidTapCount} more times for instant SOS`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Location Indicator */}
      <AnimatePresence>
        {isLoadingLocation && sosHoldProgress > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute -top-20 flex items-center gap-2 bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium"
          >
            <MapPin className="w-4 h-4" />
            {t('gettingLocation') || 'Getting GPS location...'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main SOS Button */}
      <motion.button
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        disabled={isLoadingLocation}
        className={`
          relative w-[260px] h-[260px] rounded-full
          flex items-center justify-center
          no-select touch-none
          ${isLoadingLocation ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${sosHoldProgress > 0 ? 'scale-95' : 'scale-100'}
          transition-transform duration-100
        `}
        whileTap={{ scale: 0.95 }}
      >
        {/* Outer Glow Ring */}
        <div className={`
          absolute inset-0 rounded-full
          bg-primary/20
          ${!isEmergencyActive ? 'sos-pulse' : ''}
        `} />
        
        {/* Progress Ring */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-100"
          />
        </svg>

        {/* Inner Button */}
        <div className={`
          relative w-[200px] h-[200px] rounded-full
          bg-gradient-to-br from-primary to-emergency-glow
          flex flex-col items-center justify-center
          shadow-emergency
          ${isEmergencyActive ? 'sos-active' : ''}
        `}>
          {isLoadingLocation && sosHoldProgress > 50 ? (
            <>
              <Loader2 className="w-16 h-16 text-primary-foreground animate-spin" />
              <span className="text-sm text-primary-foreground/80 mt-2">
                {t('gettingLocation') || 'Locating...'}
              </span>
            </>
          ) : (
            <>
              <span className="text-5xl font-bold text-primary-foreground tracking-wider">
                {t('sos')}
              </span>
              <span className="text-sm text-primary-foreground/80 mt-2">
                {sosHoldProgress > 0 
                  ? `${Math.round(sosHoldProgress)}%`
                  : t('holdToActivate')
                }
              </span>
            </>
          )}
        </div>
      </motion.button>

      {/* Instructions */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 text-sm text-muted-foreground text-center max-w-[280px]"
      >
        {isEmergencyActive 
          ? t('emergencyActive')
          : t('sosInstructions') || "Hold for 3 seconds or tap 3 times rapidly"
        }
      </motion.p>
    </div>
  );
};
