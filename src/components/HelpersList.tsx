import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/lib/i18n';

export interface HelperInfo {
  id: string;
  name: string;
  distance: number;
  isOnline: boolean;
  lastActive?: any;
}

interface HelpersListProps {
  helpers: HelperInfo[];
  variant?: 'compact' | 'full';
  className?: string;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

const getLastActiveText = (lastActive: any): string => {
  if (!lastActive) return '';
  
  const timestamp = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return `${Math.floor(diffHours / 24)}d ago`;
};

export const HelpersList: React.FC<HelpersListProps> = ({
  helpers,
  variant = 'full',
  className = '',
}) => {
  const { t } = useLanguage();

  // Sort: online first, then by distance
  const sortedHelpers = [...helpers].sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1;
    }
    return a.distance - b.distance;
  });

  if (helpers.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {sortedHelpers.slice(0, 5).map((helper) => (
          <div
            key={helper.id}
            className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-1"
          >
            <div className="relative">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                  {getInitials(helper.name)}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${
                  helper.isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                }`}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistance(helper.distance)}
            </span>
          </div>
        ))}
        {helpers.length > 5 && (
          <span className="text-xs text-muted-foreground px-2 py-1">
            +{helpers.length - 5} {t('more') || 'more'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t('helpersNearby') || 'Helpers Nearby'} ({helpers.length})
      </p>
      <div className="space-y-1">
        {sortedHelpers.map((helper, index) => (
          <motion.div
            key={helper.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                    {getInitials(helper.name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                    helper.isOnline ? 'bg-green-500' : 'bg-muted-foreground'
                  }`}
                  title={helper.isOnline ? 'Active' : 'Inactive'}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{helper.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${helper.isOnline ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {helper.isOnline ? '🟢 Active' : '⚪ Inactive'}
                  </span>
                  {!helper.isOnline && helper.lastActive && (
                    <span className="text-xs text-muted-foreground">
                      · {getLastActiveText(helper.lastActive)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="text-xs font-medium">{formatDistance(helper.distance)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
