import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Alert {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  triggerType: string;
  createdAt: any;
}

const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const alertsRef = collection(db, 'alerts');
    const q = query(
      alertsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsList: Alert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        alertsList.push({
          id: doc.id,
          userId: data.userId,
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          status: data.status,
          triggerType: data.triggerType || 'manual',
          createdAt: data.createdAt,
        });
      });
      setAlerts(alertsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Active</Badge>;
      case 'RESOLVED':
        return <Badge variant="default" className="flex items-center gap-1 bg-safe"><CheckCircle className="w-3 h-3" /> Resolved</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case 'manual': return 'Manual Trigger';
      case 'rapid': return 'Rapid SOS (3 taps)';
      case 'voice': return 'Voice Activated';
      case 'auto': return 'Auto-triggered';
      case 'panic': return 'Panic Detection';
      default: return type;
    }
  };

  const getMapLink = (lat: number, lng: number) => {
    return `https://maps.google.com/?q=${lat},${lng}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-foreground">My Alerts</h1>
            <p className="text-xs text-muted-foreground">View your emergency history</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <AlertTriangle className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">No Alerts Yet</h2>
            <p className="text-muted-foreground">
              Your emergency alerts will appear here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`${alert.status === 'ACTIVE' ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{formatDate(alert.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(alert.createdAt)}</p>
                        </div>
                      </div>
                      {getStatusBadge(alert.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Trigger Type */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{getTriggerTypeLabel(alert.triggerType)}</span>
                    </div>

                    {/* Location */}
                    {alert.latitude && alert.longitude && alert.latitude !== 0 ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">
                            {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                          </span>
                        </div>
                        <a
                          href={getMapLink(alert.latitude, alert.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="gap-1">
                            <ExternalLink className="w-3 h-3" />
                            View Map
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>Location unavailable</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AlertsPage;
