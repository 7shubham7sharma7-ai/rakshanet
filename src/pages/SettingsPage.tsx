import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Mic, 
  Fingerprint, 
  Bell, 
  Shield, 
  ChevronRight,
  Moon,
  Info
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { LanguageSelector } from '@/components/LanguageSelector';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';

interface SettingItemProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  children,
  onClick 
}) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl text-left"
  >
    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      )}
    </div>
    {children || <ChevronRight className="w-5 h-5 text-muted-foreground" />}
  </motion.button>
);

const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <h1 className="font-bold text-foreground text-lg">{t('settings')}</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Language Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            {t('selectLanguage')}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4">
            <LanguageSelector variant="full" />
          </div>
        </section>

        {/* Voice & Security */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Voice & Security
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={Mic}
              title={t('voiceCommands')}
              description={voiceEnabled ? t('enabled') : t('disabled')}
            >
              <Switch
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
              />
            </SettingItem>
            
            <SettingItem
              icon={Fingerprint}
              title={t('biometricLock')}
              description={biometricEnabled ? t('enabled') : t('disabled')}
            >
              <Switch
                checked={biometricEnabled}
                onCheckedChange={setBiometricEnabled}
              />
            </SettingItem>
            
            <SettingItem
              icon={Bell}
              title="Notifications"
              description={notificationsEnabled ? t('enabled') : t('disabled')}
            >
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </SettingItem>
          </div>
        </section>

        {/* Voice Commands Info */}
        {voiceEnabled && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-secondary/10 border border-secondary/30 rounded-xl p-4"
          >
            <h3 className="font-semibold text-secondary mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voice Commands Active
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Say these phrases to trigger emergency SOS:
            </p>
            <div className="flex flex-wrap gap-2">
              {['Help me', 'Emergency', 'Bachao', 'SOS'].map((phrase) => (
                <span 
                  key={phrase}
                  className="bg-secondary/20 text-secondary text-xs px-3 py-1 rounded-full"
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          </motion.section>
        )}

        {/* About Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            About
          </h2>
          <div className="space-y-3">
            <SettingItem
              icon={Shield}
              title="Privacy Policy"
              description="How we protect your data"
            />
            
            <SettingItem
              icon={Info}
              title="About RakshaSetu"
              description="Version 1.0.0"
            />
          </div>
        </section>

        {/* App Info */}
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-bold text-foreground">RakshaSetu</h3>
          <p className="text-sm text-muted-foreground">Your Safety, Our Priority</p>
          <p className="text-xs text-muted-foreground mt-2">Made with ❤️ in India</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
