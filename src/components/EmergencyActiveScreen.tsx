import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  MapPin, 
  Phone, 
  Navigation, 
  MessageCircle,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useEmergency, Helper } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const HelperCard: React.FC<{ helper: Helper }> = ({ helper }) => {
  const { t } = useLanguage();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-muted/50 rounded-xl p-4 flex items-center gap-4"
    >
      <Avatar className="h-12 w-12 border-2 border-accent">
        <AvatarFallback className="bg-accent/20 text-accent font-semibold">
          {helper.name.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground truncate">{helper.name}</h4>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {helper.distance} km
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {helper.eta} min
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button size="icon" variant="secondary" className="h-10 w-10">
          <Phone className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-10 w-10">
          <Navigation className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export const EmergencyActiveScreen: React.FC = () => {
  const {
    isEmergencyActive,
    currentSession,
    location,
    endEmergency,
    helpers,
  } = useEmergency();
  const { t } = useLanguage();

  const availableHelpers = helpers.filter(h => h.status === 'available');

  return (
    <AnimatePresence>
      {isEmergencyActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background z-40 overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-primary/10 backdrop-blur-lg border-b border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                <span className="font-bold text-primary text-lg">
                  {t('emergencyActive')}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentSession?.triggerType === 'rapid' ? '🚨 RAPID' : 
                 currentSession?.triggerType === 'auto' ? '⚠️ AUTO' : 
                 currentSession?.triggerType === 'voice' ? '🎤 VOICE' : '🆘 MANUAL'}
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
                  {currentSession?.contacts.length || 0} contacts notified
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
              
              {/* Map Placeholder */}
              <div className="h-32 bg-muted rounded-xl flex items-center justify-center mb-3">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {location 
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : 'Fetching location...'}
                  </p>
                </div>
              </div>
              
              <Button variant="secondary" className="w-full">
                <Navigation className="w-4 h-4 mr-2" />
                {t('shareLocation')}
              </Button>
            </motion.div>

            {/* Helpers */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>{t('nearbyHelpers')}</span>
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                  {availableHelpers.length} {t('available')}
                </span>
              </h3>
              
              <div className="space-y-3">
                {availableHelpers.map((helper, index) => (
                  <motion.div
                    key={helper.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <HelperCard helper={helper} />
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Chat Preview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-secondary" />
                  <span className="font-semibold">{t('emergencyChat')}</span>
                </div>
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  {currentSession?.messages.length || 0} messages
                </span>
              </div>
              
              {/* Last Message Preview */}
              {currentSession?.messages.slice(-1).map(msg => (
                <div key={msg.id} className="bg-muted rounded-lg p-3 text-sm">
                  <span className="font-medium text-secondary">{msg.senderName}: </span>
                  <span className="text-muted-foreground">{msg.content}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* End Emergency Button */}
          <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
            <Button
              onClick={endEmergency}
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
