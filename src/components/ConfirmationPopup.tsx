import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useEmergency } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export const ConfirmationPopup: React.FC = () => {
  const {
    showConfirmation,
    confirmationTimeout,
    triggerEmergency,
    cancelSOS,
  } = useEmergency();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {showConfirmation && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50"
            onClick={cancelSOS}
          />
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-center text-foreground mb-2">
                {t('areYouInDanger')}
              </h2>
              
              {/* Countdown */}
              <p className="text-center text-muted-foreground mb-6">
                Auto-sending in <span className="text-primary font-bold">{confirmationTimeout}s</span>
              </p>
              
              {/* Progress Bar */}
              <div className="h-1 bg-muted rounded-full mb-6 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
              
              {/* Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={() => triggerEmergency()}
                  variant="destructive"
                  size="lg"
                  className="w-full h-14 text-lg font-bold"
                >
                  {t('yesSendAlert')}
                </Button>
                
                <Button
                  onClick={cancelSOS}
                  variant="ghost"
                  size="lg"
                  className="w-full text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('cancel')}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
