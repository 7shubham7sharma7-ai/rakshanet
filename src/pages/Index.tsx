import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, History, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SOSButton } from '@/components/SOSButton';
import { EmergencyButton } from '@/components/EmergencyButton';
import { ConfirmationPopup } from '@/components/ConfirmationPopup';
import { EmergencyActiveScreen } from '@/components/EmergencyActiveScreen';
import { QuickActions } from '@/components/QuickActions';
import { RiskIndicator } from '@/components/RiskIndicator';
import { LanguageSelector } from '@/components/LanguageSelector';
import { BottomNav } from '@/components/BottomNav';
import { useLanguage } from '@/lib/i18n';
import { useEmergency } from '@/contexts/EmergencyContext';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { t } = useLanguage();
  const { updateLocation, location, contacts, nearbyAlerts } = useEmergency();

  useEffect(() => {
    // Request location on mount and start tracking
    updateLocation().catch(console.error);
    
    // Set up periodic location updates
    const interval = setInterval(() => {
      updateLocation().catch(console.error);
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
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
          <div className="flex items-center gap-2">
            <Link to="/helpers" className="relative">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
                {nearbyAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                    {nearbyAlerts.length}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/alerts">
              <Button variant="ghost" size="icon">
                <History className="w-5 h-5" />
              </Button>
            </Link>
            <LanguageSelector variant="compact" />
          </div>
        </div>
      </header>

      {/* Risk Indicator */}
      <div className="px-4 py-4">
        <RiskIndicator />
      </div>

      {/* Nearby Alert Banner */}
      {nearbyAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-4"
        >
          <Link to="/helpers">
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-center text-destructive font-medium">
                🚨 {nearbyAlerts.length} emergency{nearbyAlerts.length > 1 ? 'ies' : ''} nearby - Tap to help
              </p>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Big Red Emergency Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col items-center justify-center py-6"
      >
        <EmergencyButton />
      </motion.div>

      {/* Emergency Contacts Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-4 mb-4"
      >
        <Link to="/contacts">
          <div className={`p-3 rounded-xl border ${contacts.length > 0 ? 'bg-safe/10 border-safe/30' : 'bg-warning/10 border-warning/30'}`}>
            <p className={`text-sm text-center ${contacts.length > 0 ? 'text-safe' : 'text-warning'}`}>
              {contacts.length > 0 
                ? `👥 ${contacts.length} emergency contact${contacts.length > 1 ? 's' : ''} configured`
                : '⚠️ No emergency contacts. Tap to add contacts.'
              }
            </p>
          </div>
        </Link>
      </motion.div>

      {/* SOS Button (Hold-based) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col items-center justify-center py-4"
      >
        <p className="text-xs text-muted-foreground mb-2">Or use hold-to-activate SOS</p>
        <div className="transform scale-75">
          <SOSButton />
        </div>
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
            📍 GPS Active • Accuracy: {Math.round(location.accuracy)}m
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
