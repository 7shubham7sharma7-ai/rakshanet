/**
 * FCM Service - Firebase Cloud Messaging helper for push notifications
 * 
 * This service handles sending push notifications to helpers.
 * Since we don't have Firebase Cloud Functions deployed, we use the client-side
 * notification approach with Firestore triggers for background notifications.
 */

import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';

interface NotificationPayload {
  title: string;
  body: string;
  chatId: string;
  emergencyId: string;
  victimName: string;
  lat: number;
  lng: number;
}

interface HelperNotification {
  helperId: string;
  fcmToken?: string;
  distance: number;
}

/**
 * Sends push notifications to all nearby helpers by:
 * 1. Creating notification records in Firestore (helperAlerts collection)
 * 2. These records trigger real-time listeners in each helper's app
 * 3. FCM tokens are used for background/closed app notifications
 */
export const sendEmergencyNotificationsToHelpers = async (
  helpers: HelperNotification[],
  payload: NotificationPayload
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;

  for (const helper of helpers) {
    try {
      // Create an alert record that will:
      // 1. Trigger in-app real-time notification via Firestore listener
      // 2. Be used by FCM for background notifications
      await addDoc(collection(db, 'helperAlerts'), {
        helperId: helper.helperId,
        fcmToken: helper.fcmToken || null,
        emergencyId: payload.emergencyId,
        chatId: payload.chatId,
        victimName: payload.victimName,
        lat: payload.lat,
        lng: payload.lng,
        distance: helper.distance,
        status: 'pending',
        notification: {
          title: payload.title,
          body: payload.body,
        },
        createdAt: serverTimestamp(),
      });
      success++;
    } catch (error) {
      console.error(`Failed to create alert for helper ${helper.helperId}:`, error);
      failed++;
    }
  }

  return { success, failed };
};

/**
 * Fetches FCM tokens for a list of user IDs
 */
export const getHelperFCMTokens = async (
  helperIds: string[]
): Promise<Map<string, string | null>> => {
  const tokenMap = new Map<string, string | null>();
  
  if (helperIds.length === 0) return tokenMap;
  
  try {
    // Firestore 'in' queries support up to 30 items at a time
    const batchSize = 30;
    for (let i = 0; i < helperIds.length; i += batchSize) {
      const batch = helperIds.slice(i, i + batchSize);
      const usersQuery = query(
        collection(db, 'users'),
        where('__name__', 'in', batch)
      );
      
      const snapshot = await getDocs(usersQuery);
      snapshot.forEach((doc) => {
        const data = doc.data();
        tokenMap.set(doc.id, data.fcmToken || null);
      });
    }
  } catch (error) {
    console.error('Failed to fetch FCM tokens:', error);
  }
  
  return tokenMap;
};

/**
 * Sends a resolution notification to all chat participants
 */
export const sendResolutionNotification = async (
  chatId: string,
  participantIds: string[],
  victimName: string
): Promise<void> => {
  for (const participantId of participantIds) {
    try {
      await addDoc(collection(db, 'helperAlerts'), {
        helperId: participantId,
        chatId,
        type: 'resolution',
        notification: {
          title: '✅ Emergency Resolved',
          body: `${victimName} has received help. Thank you!`,
        },
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(`Failed to send resolution notification to ${participantId}:`, error);
    }
  }
};
