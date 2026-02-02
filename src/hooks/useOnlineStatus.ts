import { useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const INACTIVE_THRESHOLD = 60000; // 1 minute

export const useOnlineStatus = () => {
  const { user } = useAuth();
  const heartbeatRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
    if (!user) return;

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          isOnline,
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to update online status:', error);
    }
  }, [user]);

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const checkAndUpdateStatus = useCallback(async () => {
    const timeSinceActivity = Date.now() - lastActivityRef.current;
    const isActive = timeSinceActivity < INACTIVE_THRESHOLD;
    await updateOnlineStatus(isActive);
  }, [updateOnlineStatus]);

  useEffect(() => {
    if (!user) return;

    // Set online on mount
    updateOnlineStatus(true);

    // Activity listeners
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Heartbeat to periodically update status
    heartbeatRef.current = setInterval(checkAndUpdateStatus, HEARTBEAT_INTERVAL);

    // Set offline on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateOnlineStatus(false);
      } else {
        updateOnlineStatus(true);
        handleActivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set offline before unload
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline update
      const userRef = `users/${user.uid}`;
      navigator.sendBeacon?.(
        'https://firestore.googleapis.com',
        JSON.stringify({ isOnline: false })
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      // Set offline on unmount
      updateOnlineStatus(false);
    };
  }, [user, updateOnlineStatus, handleActivity, checkAndUpdateStatus]);

  return { updateOnlineStatus };
};
