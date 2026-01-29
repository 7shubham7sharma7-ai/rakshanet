import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { useEmergency } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';

export const RiskIndicator: React.FC = () => {
  const { riskLevel } = useEmergency();
  const { t } = useLanguage();

  const config = {
    low: {
      icon: Shield,
      color: 'text-safe',
      bgColor: 'bg-safe/10',
      borderColor: 'border-safe/30',
      label: t('safe'),
    },
    medium: {
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/30',
      label: t('medium'),
    },
    high: {
      icon: AlertTriangle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
      label: t('high'),
    },
  };

  const current = config[riskLevel];
  const Icon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${current.bgColor} border ${current.borderColor}`}
    >
      <Icon className={`w-4 h-4 ${current.color}`} />
      <span className={`text-sm font-medium ${current.color}`}>
        {t('riskLevel')}: {current.label}
      </span>
    </motion.div>
  );
};
