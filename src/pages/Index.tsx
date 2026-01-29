import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { SOSButton } from '@/components/SOSButton';
import { ConfirmationPopup } from '@/components/ConfirmationPopup';
import { EmergencyActiveScreen } from '@/components/EmergencyActiveScreen';
import { QuickActions } from '@/components/QuickActions';
import { RiskIndicator } from '@/components/RiskIndicator';
import { LanguageSelector } from '@/components/LanguageSelector';
import { BottomNav } from '@/components/BottomNav';
import { useLanguage } from '@/lib/i18n';
import { useEmergency } from '@/contexts/EmergencyContext';

const Index = () => {
  const { t } = useLanguage();
  const { updateLocation, location } = useEmergency();

  useEffect(() => {
    // Request location on mount
    updateLocation().catch(console.error);
  }, [updateLocation]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">{t('appName')}</h1>
              <p className="text-xs text-muted-foreground">{t('tagline')}</p>
            </div>
          </div>
          <LanguageSelector variant="compact" />
        </div>
      </header>

      {/* Risk Indicator */}
      <div className="px-4 py-4">
        <RiskIndicator />
      </div>

      {/* Main SOS Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <SOSButton />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <QuickActions />
      </motion.div>

      {/* Location Status */}
      {location && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mx-4 p-3 bg-safe/10 border border-safe/30 rounded-xl"
        >
          <p className="text-sm text-safe text-center">
            📍 Location active • Accuracy: {Math.round(location.accuracy)}m
          </p>
        </motion.div>
      )}

      {/* Confirmation Popup */}
      <ConfirmationPopup />
      
      {/* Emergency Active Screen */}
      <EmergencyActiveScreen />

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
