import React from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, 
  Truck, 
  Flame, 
  MapPin, 
  Video, 
  PhoneCall 
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

const QUICK_ACTIONS = [
  { id: 'police', icon: Phone, label: 'callPolice', number: '100', color: 'bg-secondary' },
  { id: 'ambulance', icon: Truck, label: 'callAmbulance', number: '108', color: 'bg-accent' },
  { id: 'fire', icon: Flame, label: 'callFire', number: '101', color: 'bg-alert' },
  { id: 'location', icon: MapPin, label: 'shareLocation', color: 'bg-calm' },
  { id: 'evidence', icon: Video, label: 'recordEvidence', color: 'bg-panic' },
  { id: 'fake', icon: PhoneCall, label: 'fakeCall', color: 'bg-muted-foreground' },
];

export const QuickActions: React.FC = () => {
  const { t } = useLanguage();

  const handleAction = (actionId: string, number?: string) => {
    if (number) {
      // In production, this would use native dialer
      window.location.href = `tel:${number}`;
    }
    console.log('Action triggered:', actionId);
  };

  return (
    <div className="px-4 pb-6">
      <h3 className="font-semibold mb-3 text-foreground">{t('quickActions')}</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleAction(action.id, action.number)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted transition-colors"
          >
            <div className={`w-12 h-12 rounded-full ${action.color}/20 flex items-center justify-center`}>
              <action.icon className={`w-5 h-5 text-foreground`} />
            </div>
            <span className="text-xs text-center text-muted-foreground font-medium">
              {t(action.label)}
            </span>
            {action.number && (
              <span className="text-xs font-bold text-foreground">{action.number}</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
