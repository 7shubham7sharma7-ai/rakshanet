import React from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLanguage } from '@/lib/i18n';

interface NotificationPermissionProps {
  variant?: 'banner' | 'card' | 'inline';
  onComplete?: () => void;
}

export const NotificationPermission: React.FC<NotificationPermissionProps> = ({ 
  variant = 'card',
  onComplete 
}) => {
  const { t } = useLanguage();
  const { notificationPermission, requestPermission, isSupported } = usePushNotifications();

  // Don't show if not supported or already granted/denied
  if (!isSupported || notificationPermission === 'granted') {
    return null;
  }

  if (notificationPermission === 'denied') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl bg-warning/10 border border-warning/30 ${
          variant === 'inline' ? 'mx-4' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm">
              {t('notificationsBlocked') || 'Notifications Blocked'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('enableNotificationsInSettings') || 
                'To receive emergency alerts, please enable notifications in your browser settings.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const handleAllow = async () => {
    await requestPermission();
    onComplete?.();
  };

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-primary/10 border border-primary/30 ${
        variant === 'inline' ? 'mx-4' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground text-sm">
            {t('enableNotifications') || 'Enable Emergency Notifications'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            {t('notificationPermissionExplain') || 
              'Receive instant alerts when someone nearby needs help. Works even when the app is closed.'}
          </p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAllow}
              className="gap-1"
            >
              <Check className="w-4 h-4" />
              {t('allow') || 'Allow'}
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleSkip}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              {t('later') || 'Later'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
