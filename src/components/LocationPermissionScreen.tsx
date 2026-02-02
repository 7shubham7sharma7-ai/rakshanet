import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, AlertTriangle, Settings, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

interface LocationPermissionScreenProps {
  onPermissionGranted: () => void;
  error?: string | null;
  isRequesting?: boolean;
}

export const LocationPermissionScreen: React.FC<LocationPermissionScreenProps> = ({
  onPermissionGranted,
  error,
  isRequesting = false,
}) => {
  const { t } = useLanguage();
  const [showInstructions, setShowInstructions] = useState(false);

  const handleRequestPermission = async () => {
    if (isRequesting) return;
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });
      
      if (position) {
        onPermissionGranted();
      }
    } catch (err: any) {
      if (err.code === err.PERMISSION_DENIED) {
        setShowInstructions(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-6 text-center"
      >
        {/* Icon */}
        <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="w-12 h-12 text-primary" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('locationPermissionRequired') || 'Location Permission Required'}
          </h1>
          <p className="text-muted-foreground">
            {t('locationPermissionExplain') || 
              'We need your location to enable SOS alerts and connect you with nearby helpers in emergencies.'}
          </p>
        </div>

        {/* Features */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">🆘</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{t('sosAlerts') || 'SOS Alerts'}</p>
              <p className="text-xs text-muted-foreground">
                {t('sosAlertsDesc') || 'Share your location instantly during emergencies'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">👥</span>
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{t('nearbyHelpers') || 'Nearby Helpers'}</p>
              <p className="text-xs text-muted-foreground">
                {t('nearbyHelpersDesc') || 'Find and connect with helpers near you'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-destructive/10 border border-destructive/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <div className="text-left">
                <p className="text-sm text-destructive font-medium">
                  {t('locationError') || 'Location Error'}
                </p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions for denied permission */}
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-left"
          >
            <div className="flex items-start gap-2 mb-3">
              <Settings className="w-5 h-5 text-warning shrink-0" />
              <p className="text-sm font-medium text-warning">
                {t('enableLocationInSettings') || 'Enable Location in Settings'}
              </p>
            </div>
            <ol className="text-xs text-muted-foreground space-y-2 ml-7">
              <li>1. {t('openBrowserSettings') || 'Open your browser settings'}</li>
              <li>2. {t('findSiteSettings') || 'Find "Site Settings" or "Permissions"'}</li>
              <li>3. {t('selectLocation') || 'Select "Location"'}</li>
              <li>4. {t('allowForThisSite') || 'Allow location for this site'}</li>
              <li>5. {t('refreshPage') || 'Refresh the page'}</li>
            </ol>
            <p className="text-xs text-warning mt-3">
              <strong>Android:</strong> {t('androidOverlayNote') || 'If you see an overlay error, disable any screen overlay apps and try again.'}
            </p>
          </motion.div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleRequestPermission}
          disabled={isRequesting}
          size="lg"
          className="w-full gap-2"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('gettingLocation') || 'Getting Location...'}
            </>
          ) : showInstructions ? (
            <>
              <RefreshCw className="w-5 h-5" />
              {t('tryAgain') || 'Try Again'}
            </>
          ) : (
            <>
              <MapPin className="w-5 h-5" />
              {t('allowLocation') || 'Allow Location'}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          {t('locationPrivacy') || 'Your location is only shared during emergencies and with trusted helpers.'}
        </p>
      </motion.div>
    </div>
  );
};
