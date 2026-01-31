import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  MapPin, 
  MessageCircle,
  CheckCircle,
  X,
  Users
} from 'lucide-react';
import { useEmergency } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const EmergencyActiveScreen: React.FC = () => {
  const {
    isEmergencyActive,
    currentEmergency,
    location,
    resolveEmergency,
    chatMessages,
    contacts,
  } = useEmergency();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {isEmergencyActive && currentEmergency && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background z-40 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-destructive/10 backdrop-blur-lg border-b border-destructive/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="font-bold text-destructive text-lg">
                  {t('emergencyActive')}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                🆘 ACTIVE
              </span>
            </div>
          </div>

          <div className="p-4 pb-24 space-y-6">
            {/* Status Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-accent/10 border border-accent/30 rounded-2xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{t('helpOnTheWay')}</h3>
                  <p className="text-sm text-muted-foreground">{t('alertSent')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-accent" />
                <span className="text-muted-foreground">
                  Nearby users are being notified
                </span>
              </div>
            </motion.div>

            {/* Location */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 text-secondary" />
                <span className="font-semibold">{t('yourLocation')}</span>
              </div>
              
              {/* Map Link */}
              <div className="h-32 bg-muted rounded-xl flex items-center justify-center mb-3">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {currentEmergency.lat !== 0 
                      ? `${currentEmergency.lat.toFixed(4)}, ${currentEmergency.lng.toFixed(4)}`
                      : 'Location unavailable'}
                  </p>
                </div>
              </div>
              
              <Button 
                variant="secondary" 
                className="w-full"
                asChild
              >
                <a 
                  href={`https://maps.google.com/?q=${currentEmergency.lat},${currentEmergency.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Map
                </a>
              </Button>
            </motion.div>

            {/* Nearby Users Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-secondary" />
                <span className="font-semibold">Nearby Helpers</span>
              </div>
              <p className="text-sm text-muted-foreground">
                All users within 5km will receive an in-app alert and can join your emergency chat to coordinate help.
              </p>
            </motion.div>

            {/* Chat Preview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-secondary" />
                  <span className="font-semibold">{t('emergencyChat')}</span>
                </div>
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  {chatMessages.length} messages
                </span>
              </div>
              
              {/* Last Message Preview */}
              {chatMessages.slice(-1).map(msg => (
                <div key={msg.id} className="bg-muted rounded-lg p-3 text-sm mb-3">
                  <span className="font-medium text-secondary">{msg.senderName}: </span>
                  <span className="text-muted-foreground">{msg.text}</span>
                </div>
              ))}

              <Button variant="secondary" className="w-full" asChild>
                <Link to="/chat">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Chat
                </Link>
              </Button>
            </motion.div>
          </div>

          {/* End Emergency Button */}
          <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <Button
              onClick={resolveEmergency}
              variant="outline"
              size="lg"
              className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              <X className="w-4 h-4 mr-2" />
              {t('endEmergency')}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
