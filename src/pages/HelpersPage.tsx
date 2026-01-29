import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Navigation, Clock, Filter } from 'lucide-react';
import { useEmergency, Helper } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const HelperCard: React.FC<{ helper: Helper; index: number }> = ({ helper, index }) => {
  const { t } = useLanguage();
  
  const statusConfig = {
    available: { color: 'bg-accent', text: t('available') },
    busy: { color: 'bg-warning', text: t('busy') },
    offline: { color: 'bg-muted-foreground', text: t('offline') },
  };
  
  const status = statusConfig[helper.status];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="h-14 w-14 border-2 border-border">
          <AvatarFallback className="bg-muted text-lg font-semibold">
            {helper.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{helper.name}</h3>
          <p className="text-sm text-muted-foreground">{helper.phone}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="text-xs text-muted-foreground">{status.text}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{helper.distance} km away</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{helper.eta} min ETA</span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="secondary" 
          className="flex-1 gap-2"
          disabled={helper.status !== 'available'}
          asChild
        >
          <a href={`tel:${helper.phone}`}>
            <Phone className="w-4 h-4" />
            {t('callNow')}
          </a>
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 gap-2"
          disabled={helper.status !== 'available'}
        >
          <Navigation className="w-4 h-4" />
          {t('navigate')}
        </Button>
      </div>
    </motion.div>
  );
};

const HelpersPage: React.FC = () => {
  const { t } = useLanguage();
  const { helpers } = useEmergency();
  
  const availableCount = helpers.filter(h => h.status === 'available').length;
  const sortedHelpers = [...helpers].sort((a, b) => {
    if (a.status === 'available' && b.status !== 'available') return -1;
    if (b.status === 'available' && a.status !== 'available') return 1;
    return (a.distance || 0) - (b.distance || 0);
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground">{t('nearbyHelpers')}</h1>
            <p className="text-xs text-muted-foreground">
              {availableCount} of {helpers.length} {t('available').toLowerCase()}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </header>

      {/* Helper List */}
      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-accent">{availableCount}</p>
            <p className="text-xs text-muted-foreground">{t('available')}</p>
          </div>
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-warning">
              {helpers.filter(h => h.status === 'busy').length}
            </p>
            <p className="text-xs text-muted-foreground">{t('busy')}</p>
          </div>
          <div className="bg-muted rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {helpers.filter(h => h.status === 'offline').length}
            </p>
            <p className="text-xs text-muted-foreground">{t('offline')}</p>
          </div>
        </div>

        {/* Helper Cards */}
        <div className="space-y-3">
          {sortedHelpers.map((helper, index) => (
            <HelperCard key={helper.id} helper={helper} index={index} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HelpersPage;
