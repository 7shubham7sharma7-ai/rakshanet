import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, MessageCircle, Clock, AlertTriangle, Users } from 'lucide-react';
import { useEmergency, NearbyUser } from '@/contexts/EmergencyContext';
import { useLanguage } from '@/lib/i18n';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

const HelpersPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { nearbyAlerts, joinEmergencyChat, location } = useEmergency();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-foreground">Nearby Emergencies</h1>
            <p className="text-xs text-muted-foreground">
              {nearbyAlerts.length} active within 5km
            </p>
          </div>
          {location && (
            <div className="text-xs text-muted-foreground">
              📍 GPS Active
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-destructive">{nearbyAlerts.length}</p>
            <p className="text-xs text-muted-foreground">Need Help</p>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-primary">5km</p>
            <p className="text-xs text-muted-foreground">Alert Radius</p>
          </div>
        </div>

        {/* No alerts */}
        {nearbyAlerts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card border border-border rounded-xl p-8 text-center"
          >
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Emergencies Nearby</h3>
            <p className="text-sm text-muted-foreground">
              When someone within 5km triggers an emergency,<br />
              you'll see their alert here and can offer help.
            </p>
          </motion.div>
        )}

        {/* Alert Cards */}
        {nearbyAlerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-destructive/50 rounded-xl p-4"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-destructive">
                  <AvatarFallback className="bg-destructive/20 text-destructive text-lg font-semibold">
                    {alert.victimName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-destructive animate-pulse" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{alert.victimName}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium">
                    URGENT
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.victimEmail}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{(alert as any).distance?.toFixed(1) || '?'} km away</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock className="w-4 h-4" />
                    <span>
                      {alert.timestamp?.toDate 
                        ? new Date(alert.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2"
                variant="destructive"
                onClick={async () => {
                  await joinEmergencyChat(alert);
                  navigate('/chat');
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Join & Help
              </Button>
              <Button 
                variant="outline" 
                className="gap-2"
                asChild
              >
                <a 
                  href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin className="w-4 h-4" />
                  Navigate
                </a>
              </Button>
            </div>
          </motion.div>
        ))}

        {/* Info Card */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground text-sm mb-1">How it works</h4>
              <p className="text-xs text-muted-foreground">
                When someone nearby triggers an emergency, you'll receive an in-app alert. 
                Join their chat to coordinate help and view their live location. 
                Your location is shared with them when you join.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HelpersPage;
