import { useEffect, useCallback, useState } from 'react';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Public VAPID key for FCM - this is safe to be in client code
const VAPID_KEY = 'BKw7SnP5h5GBqG8aNKzSI-MsDyF4c7W3J8vL6mPqQ_jZAKfXVmGk8DnF1YrT3xZQ5sWvPbE2RnD1KjLm9xYF5kg';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);

  // Initialize messaging
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      try {
        const messagingInstance = getMessaging(app);
        setMessaging(messagingInstance);
      } catch (error) {
        console.log('FCM not supported in this browser:', error);
      }
    }
  }, []);

  // Check current permission status
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission and get FCM token
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted' && messaging) {
        // Register service worker for FCM
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          setFcmToken(token);
          
          // Save token to user's Firestore document
          if (user) {
            await setDoc(
              doc(db, 'users', user.uid),
              {
                fcmToken: token,
                fcmTokenUpdatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
          
          console.log('FCM Token:', token);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [messaging, user]);

  // Listen for foreground messages
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show toast for foreground messages
      toast({
        title: payload.notification?.title || '🚨 Emergency Alert',
        description: payload.notification?.body || 'Someone nearby needs help!',
        variant: 'destructive',
      });

      // Also show native notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Emergency Alert', {
          body: payload.notification?.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'emergency-alert',
          requireInteraction: true,
          data: payload.data,
        });
      }
    });

    return () => unsubscribe();
  }, [messaging]);

  // Update FCM token in Firestore when user changes
  useEffect(() => {
    if (user && fcmToken) {
      setDoc(
        doc(db, 'users', user.uid),
        {
          fcmToken,
          fcmTokenUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(console.error);
    }
  }, [user, fcmToken]);

  return {
    notificationPermission,
    fcmToken,
    requestPermission,
    isSupported: !!messaging,
  };
};
