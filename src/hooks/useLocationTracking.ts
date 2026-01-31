import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface LocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export const useLocationTracking = () => {
  const { user, updateUserLocation } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const [locationState, setLocationState] = useState<LocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  const requestLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      }));
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      
      if (result.state === 'denied') {
        setLocationState(prev => ({
          ...prev,
          error: 'Location permission denied. Please enable in device settings.',
          loading: false,
        }));
        toast({
          title: "Location Required",
          description: "Please enable location access to use emergency features",
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      return true;
    }
  }, []);

  const getCurrentLocation = useCallback((): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }, []);

  const handlePositionUpdate = useCallback(async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    
    setLocationState({
      lat: latitude,
      lng: longitude,
      accuracy,
      error: null,
      loading: false,
    });

    // Update user's location in Firestore
    if (user) {
      try {
        await updateUserLocation(latitude, longitude);
      } catch (error) {
        console.error('Failed to update location in Firestore:', error);
      }
    }
  }, [user, updateUserLocation]);

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unable to get location';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable in settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable. Check if GPS is enabled.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }
    
    setLocationState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false,
    }));
  }, []);

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) return;
    
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    // Get initial location
    try {
      const position = await getCurrentLocation();
      await handlePositionUpdate(position);
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        handlePositionError(error);
      }
    }

    // Start watching for updates
    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000, // Update every 10 seconds minimum
        }
      );
    }
  }, [requestLocationPermission, getCurrentLocation, handlePositionUpdate, handlePositionError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Start tracking when user is logged in
  useEffect(() => {
    if (user) {
      startTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [user, startTracking, stopTracking]);

  return {
    ...locationState,
    startTracking,
    stopTracking,
    getCurrentLocation,
  };
};
