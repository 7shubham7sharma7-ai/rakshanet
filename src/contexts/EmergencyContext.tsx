import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  Timestamp,
  setDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';

// Types
export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  phoneNumber?: string;
  relationship: string;
  isPrimary: boolean;
  userId?: string;
}

export interface NearbyUser {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  lat: number;
  lng: number;
  distance: number;
  lastUpdated: any;
}

export interface EmergencyAlert {
  id: string;
  victimId: string;
  victimName: string;
  victimEmail: string | null;
  victimPhone: string | null;
  lat: number;
  lng: number;
  status: 'waiting' | 'active' | 'closed';
  timestamp: any;
  chatId?: string;
  languagePreference?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  text: string;
  timestamp: any;
  type?: 'text' | 'location' | 'system';
  lat?: number;
  lng?: number;
}

export interface Chat {
  id: string;
  emergencyId: string;
  participants: string[];
  activeStatus: boolean;
  createdAt: any;
  expiresAt?: any;
}

export interface HelperWithStatus {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  distance: number;
  isOnline: boolean;
  lastActive?: any;
  lat: number;
  lng: number;
}

interface EmergencyContextType {
  // State
  isEmergencyActive: boolean;
  currentEmergency: EmergencyAlert | null;
  location: Location | null;
  contacts: EmergencyContact[];
  nearbyAlerts: EmergencyAlert[];
  currentChat: Chat | null;
  chatMessages: ChatMessage[];
  locationError: string | null;
  isLoadingLocation: boolean;
  chatHelpers: HelperWithStatus[];
  locationPermissionGranted: boolean;
  
  // Actions
  triggerEmergency: () => Promise<void>;
  resolveEmergency: () => Promise<void>;
  updateLocation: () => Promise<Location | null>;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  sendLocationMessage: () => Promise<void>;
  joinEmergencyChat: (emergency: EmergencyAlert) => Promise<void>;
  checkLocationPermission: () => Promise<boolean>;
  
  // SOS State
  sosHoldProgress: number;
  setSosHoldProgress: (progress: number) => void;
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;
  confirmationTimeout: number;
  rapidTapCount: number;
  registerRapidTap: () => void;
  cancelSOS: () => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Expanding radius search: start at 5km, increment by 5km until helper found
const MAX_SEARCH_RADIUS = 50; // Maximum 50km
const RADIUS_INCREMENT = 5; // Increment by 5km

const findNearbyUsersWithExpansion = async (
  lat: number, 
  lng: number, 
  currentUserId: string
): Promise<{ users: HelperWithStatus[], radius: number }> => {
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  
  // Start at 5km and expand by 5km increments until we find at least one helper
  for (let radius = 5; radius <= MAX_SEARCH_RADIUS; radius += RADIUS_INCREMENT) {
    const nearbyUsers: HelperWithStatus[] = [];
    
    usersSnapshot.forEach((docSnap) => {
      const userData = docSnap.data();
      if (docSnap.id === currentUserId) return;
      if (!userData.lat || !userData.lng) return;
      
      const distance = calculateDistance(lat, lng, userData.lat, userData.lng);
      if (distance <= radius) {
        // Check if user is considered online (active within last 5 minutes)
        const lastActive = userData.lastActive?.toDate?.() || userData.lastUpdated?.toDate?.();
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isOnline = userData.isOnline === true || (lastActive && lastActive > fiveMinutesAgo);
        
        nearbyUsers.push({
          id: docSnap.id,
          name: userData.displayName || userData.email?.split('@')[0] || 'Helper',
          email: userData.email || null,
          phone: userData.phone || null,
          lat: userData.lat,
          lng: userData.lng,
          distance,
          isOnline,
          lastActive: userData.lastActive || userData.lastUpdated,
        });
      }
    });
    
    // Stop expanding as soon as we find at least one helper
    if (nearbyUsers.length > 0) {
      // Sort: online first, then by distance
      nearbyUsers.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.distance - b.distance;
      });
      return { users: nearbyUsers, radius };
    }
  }
  
  return { users: [], radius: MAX_SEARCH_RADIUS };
};

// Chat expiry constant: 1 hour
const CHAT_EXPIRY_MS = 60 * 60 * 1000;

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, updateUserLocation } = useAuth();
  const { language } = useLanguage();
  
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState<EmergencyAlert | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [nearbyAlerts, setNearbyAlerts] = useState<EmergencyAlert[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [chatHelpers, setChatHelpers] = useState<HelperWithStatus[]>([]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  // SOS Button State
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(5);
  const [rapidTapCount, setRapidTapCount] = useState(0);
  const rapidTapTimeoutRef = useRef<NodeJS.Timeout>();
  const chatExpiryTimeoutRef = useRef<NodeJS.Timeout>();

  // Check location permission on mount
  const checkLocationPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setLocationPermissionGranted(false);
      return false;
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      const granted = result.state === 'granted';
      setLocationPermissionGranted(granted);
      return granted;
    } catch {
      // Fallback: try to get position
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationPermissionGranted(true);
            resolve(true);
          },
          () => {
            setLocationPermissionGranted(false);
            resolve(false);
          },
          { timeout: 5000 }
        );
      });
    }
  }, []);

  // Check permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  // Subscribe to contacts
  useEffect(() => {
    if (!user) {
      setContacts([]);
      return;
    }

    const contactsRef = collection(db, 'emergencyContacts');
    const q = query(contactsRef, where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contactsList: EmergencyContact[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        contactsList.push({ 
          id: doc.id, 
          name: data.name,
          phone: data.phoneNumber || data.phone,
          phoneNumber: data.phoneNumber || data.phone,
          relationship: data.relationship || 'Other',
          isPrimary: data.isPrimary || false,
          userId: data.userId
        } as EmergencyContact);
      });
      setContacts(contactsList);
    });

    return unsubscribe;
  }, [user]);

  // Subscribe to user's active emergency (waiting or active status)
  useEffect(() => {
    if (!user) return;

    const emergenciesRef = collection(db, 'emergencies');
    const q = query(
      emergenciesRef,
      where('victimId', '==', user.uid),
      where('status', 'in', ['waiting', 'active'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Get the most recent emergency
        const emergencyDoc = snapshot.docs.sort((a, b) => {
          const aTime = a.data().timestamp?.toMillis?.() || 0;
          const bTime = b.data().timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        })[0];
        const data = emergencyDoc.data();
        setCurrentEmergency({
          id: emergencyDoc.id,
          ...data
        } as EmergencyAlert);
        setIsEmergencyActive(true);
        
        // Load the associated chat
        if (data.chatId) {
          getDoc(doc(db, 'chats', data.chatId)).then((chatDoc) => {
            if (chatDoc.exists()) {
              setCurrentChat({
                id: chatDoc.id,
                ...chatDoc.data()
              } as Chat);
            }
          });
        }
      } else {
        setCurrentEmergency(null);
        setIsEmergencyActive(false);
      }
    });

    return unsubscribe;
  }, [user]);

  // Subscribe to nearby active emergencies (for helpers)
  useEffect(() => {
    if (!user || !location) return;

    const emergenciesRef = collection(db, 'emergencies');
    const q = query(
      emergenciesRef,
      where('status', 'in', ['waiting', 'active'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts: EmergencyAlert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.victimId === user.uid) return;
        
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          data.lat,
          data.lng
        );
        
        // Show emergencies within expanding radius (start with 5km for display)
        if (distance <= 20) {
          alerts.push({
            id: doc.id,
            ...data,
            distance
          } as EmergencyAlert & { distance: number });
        }
      });
      
      // Sort by distance
      alerts.sort((a, b) => ((a as any).distance || 0) - ((b as any).distance || 0));
      setNearbyAlerts(alerts);
    });

    return unsubscribe;
  }, [user, location]);

  // Subscribe to helper alerts (in-app notifications for nearby emergencies)
  useEffect(() => {
    if (!user) return;

    const alertsRef = collection(db, 'helperAlerts');
    const q = query(
      alertsRef,
      where('helperId', '==', user.uid),
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const alertData = change.doc.data();
          
          // Show in-app toast notification
          toast({
            title: "🚨 Emergency Alert!",
            description: `${alertData.victimName} needs help! ${alertData.distance?.toFixed(1) || '?'} km away`,
            variant: "destructive",
          });
          
          // Show native browser notification if permitted with chatId for navigation
          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('🚨 Emergency Near You!', {
              body: `${alertData.victimName} needs help! Tap to respond.`,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `emergency-${alertData.emergencyId}`,
              requireInteraction: true,
              data: {
                chatId: alertData.chatId,
                emergencyId: alertData.emergencyId,
                url: '/chat'
              }
            });
            
            notification.onclick = async () => {
              window.focus();
              // Navigate to chat page with the emergency chat
              if (alertData.chatId) {
                // Join the chat as participant
                const chatRef = doc(db, 'chats', alertData.chatId);
                const chatDoc = await getDoc(chatRef);
                if (chatDoc.exists()) {
                  await updateDoc(chatRef, {
                    participants: arrayUnion(user.uid)
                  });
                }
                window.location.href = '/chat';
              }
            };
          }
          
          // Mark alert as delivered
          try {
            await updateDoc(change.doc.ref, { status: 'delivered' });
          } catch (e) {
            console.error('Failed to update alert status:', e);
          }
        }
      });
    });

    return unsubscribe;
  }, [user]);

  // Subscribe to current chat messages
  useEffect(() => {
    if (!currentChat) {
      setChatMessages([]);
      return;
    }

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', currentChat.id),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as ChatMessage);
      });
      setChatMessages(messages);
    });

    return unsubscribe;
  }, [currentChat]);

  // Auto-trigger on confirmation timeout
  useEffect(() => {
    if (showConfirmation && confirmationTimeout > 0) {
      const timer = setTimeout(() => {
        setConfirmationTimeout(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showConfirmation && confirmationTimeout === 0) {
      triggerEmergency();
    }
  }, [showConfirmation, confirmationTimeout]);

  const updateLocation = useCallback(async (): Promise<Location | null> => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser/device';
        setLocationError(error);
        setIsLoadingLocation(false);
        toast({
          title: "Location Error",
          description: error,
          variant: "destructive",
        });
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(newLocation);
          setLocationError(null);
          setIsLoadingLocation(false);
          
          // Update user's location in Firestore
          if (user) {
            try {
              await updateUserLocation(newLocation.latitude, newLocation.longitude);
            } catch (error) {
              console.error('Failed to update location in Firestore:', error);
            }
          }
          
          resolve(newLocation);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your device settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable. Check if GPS is enabled.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Retrying...';
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const newLocation: Location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                  };
                  setLocation(newLocation);
                  setLocationError(null);
                  setIsLoadingLocation(false);
                  
                  if (user) {
                    await updateUserLocation(newLocation.latitude, newLocation.longitude);
                  }
                  
                  resolve(newLocation);
                },
                () => {
                  setLocationError('GPS failed. Please check settings.');
                  setIsLoadingLocation(false);
                  reject(new Error('GPS failed'));
                },
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 }
              );
              return;
          }
          
          setLocationError(errorMessage);
          setIsLoadingLocation(false);
          toast({
            title: "Location Error",
            description: errorMessage,
            variant: "destructive",
          });
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, [user, updateUserLocation]);

  const triggerEmergency = useCallback(async () => {
    if (!user || !userProfile) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use emergency features",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmation(false);
    setConfirmationTimeout(5);
    
    let currentLocation: Location | null = location;
    if (!currentLocation) {
      try {
        currentLocation = await updateLocation();
      } catch (error) {
        console.error('Could not get location:', error);
        toast({
          title: "Location Warning",
          description: "Emergency triggered without precise location.",
          variant: "destructive",
        });
      }
    }

    const lat = currentLocation?.latitude || 0;
    const lng = currentLocation?.longitude || 0;
    
    try {
      // 1. Create NEW emergency document every time (status: waiting initially)
      const emergencyData = {
        victimId: user.uid,
        victimName: userProfile.displayName || 'User',
        victimEmail: userProfile.email || null,
        victimPhone: userProfile.phone || null,
        lat,
        lng,
        status: 'waiting' as const,
        timestamp: serverTimestamp(),
        languagePreference: language,
      };
      
      const emergencyRef = await addDoc(collection(db, 'emergencies'), emergencyData);
      console.log('New emergency created:', emergencyRef.id);
      
      // 2. Create chat for this emergency with activeStatus
      const chatData: Omit<Chat, 'id'> = {
        emergencyId: emergencyRef.id,
        participants: [user.uid],
        activeStatus: true,
        createdAt: serverTimestamp(),
      };
      
      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      
      // Update emergency with chatId
      await updateDoc(emergencyRef, { chatId: chatRef.id });
      
      // Set current chat
      setCurrentChat({
        id: chatRef.id,
        ...chatData
      });
      
      // 3. Add system message to chat
      await addDoc(collection(db, 'messages'), {
        chatId: chatRef.id,
        senderId: 'system',
        senderName: 'System',
        text: '🚨 EMERGENCY ACTIVATED - Help is being requested',
        timestamp: serverTimestamp(),
      });
      
      // 4. Find nearby users with expanding radius (5km increments)
      const { users: nearbyUsers, radius: foundRadius } = await findNearbyUsersWithExpansion(lat, lng, user.uid);
      
      // Store helpers for display
      setChatHelpers(nearbyUsers);
      
      // 5. Add helpers to chat participants and send them alerts
      if (nearbyUsers.length > 0) {
        const helperIds = nearbyUsers.map(h => h.id);
        // Use arrayUnion to avoid overwriting existing participants
        await updateDoc(chatRef, {
          participants: arrayUnion(user.uid, ...helperIds)
        });
        
        // 5b. Create in-app alerts for nearby helpers (stored in Firestore for real-time updates)
        // These will trigger the nearbyAlerts listener in each helper's app
        for (const helper of nearbyUsers) {
          try {
            await addDoc(collection(db, 'helperAlerts'), {
              helperId: helper.id,
              emergencyId: emergencyRef.id,
              chatId: chatRef.id,
              victimName: userProfile.displayName || 'User',
              victimId: user.uid,
              lat,
              lng,
              distance: helper.distance,
              status: 'pending',
              createdAt: serverTimestamp(),
            });
          } catch (e) {
            console.error('Failed to create helper alert:', e);
          }
        }
      }
      
      // 6. Update emergency status to 'active' once helpers are notified
      await updateDoc(emergencyRef, { status: 'active' });
      
      // 7. Auto-send victim's location as first message
      if (lat && lng) {
        await addDoc(collection(db, 'messages'), {
          chatId: chatRef.id,
          senderId: user.uid,
          senderName: userProfile.displayName || 'User',
          text: `📍 My current location: https://maps.google.com/?q=${lat},${lng}`,
          type: 'location',
          lat,
          lng,
          timestamp: serverTimestamp(),
        });
      }
      
      // 8. Set up auto-expiry timer (1 hour)
      const expiryTime = new Date(Date.now() + CHAT_EXPIRY_MS);
      await updateDoc(chatRef, { expiresAt: Timestamp.fromDate(expiryTime) });
      
      chatExpiryTimeoutRef.current = setTimeout(async () => {
        // Auto-close chat after 1 hour - set status to 'closed'
        try {
          await updateDoc(chatRef, { activeStatus: false });
          await updateDoc(emergencyRef, { status: 'closed' });
          await addDoc(collection(db, 'messages'), {
            chatId: chatRef.id,
            senderId: 'system',
            senderName: 'System',
            text: '⏰ This emergency chat has automatically ended after 1 hour.',
            type: 'system',
            timestamp: serverTimestamp(),
          });
        } catch (e) {
          console.error('Failed to auto-expire chat:', e);
        }
      }, CHAT_EXPIRY_MS);
      
      setIsEmergencyActive(true);
      
      toast({
        title: "🆘 Emergency Activated",
        description: nearbyUsers.length > 0 
          ? `${nearbyUsers.length} user${nearbyUsers.length !== 1 ? 's' : ''} within ${foundRadius}km will be notified`
          : `Alert sent. Searching within ${foundRadius}km radius.`,
      });
      
    } catch (error) {
      console.error('Error creating emergency:', error);
      toast({
        title: "Error",
        description: "Failed to create emergency. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, userProfile, location, language, updateLocation]);

  const resolveEmergency = useCallback(async () => {
    if (!currentEmergency || !user) return;
    
    try {
      // Update emergency status to 'closed'
      await updateDoc(doc(db, 'emergencies', currentEmergency.id), {
        status: 'closed',
        resolvedAt: serverTimestamp(),
      });
      
      // Close the chat (set activeStatus to false)
      if (currentChat) {
        await updateDoc(doc(db, 'chats', currentChat.id), {
          activeStatus: false,
        });
        
        // Add system message notifying all helpers
        await addDoc(collection(db, 'messages'), {
          chatId: currentChat.id,
          senderId: 'system',
          senderName: 'System',
          text: '✅ Help has been received! Emergency resolved. Thank you to all helpers!',
          type: 'system',
          timestamp: serverTimestamp(),
        });
      }
      
      // Clear expiry timer
      if (chatExpiryTimeoutRef.current) {
        clearTimeout(chatExpiryTimeoutRef.current);
      }
      
      setIsEmergencyActive(false);
      setCurrentEmergency(null);
      setCurrentChat(null);
      setChatHelpers([]);
      
      toast({
        title: "Help Received!",
        description: "Emergency resolved. All helpers have been notified. Stay safe!",
      });
    } catch (error) {
      console.error('Error resolving emergency:', error);
      toast({
        title: "Error",
        description: "Failed to resolve emergency",
        variant: "destructive",
      });
    }
  }, [currentEmergency, currentChat, user]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'emergencyContacts'), {
        ...contact,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Contact Added",
        description: `${contact.name} has been added to your emergency contacts`,
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    }
  }, [user]);

  const removeContact = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'emergencyContacts', id));
      toast({
        title: "Contact Removed",
        description: "Emergency contact has been removed",
      });
    } catch (error) {
      console.error('Error removing contact:', error);
      toast({
        title: "Error",
        description: "Failed to remove contact",
        variant: "destructive",
      });
    }
  }, []);

  const sendChatMessage = useCallback(async (text: string) => {
    if (!currentChat || !user || !userProfile) return;
    
    // Check if chat is still active
    if (!currentChat.activeStatus) {
      toast({
        title: "Chat Ended",
        description: "This emergency chat has ended.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Ensure user is in participants before sending
      const chatRef = doc(db, 'chats', currentChat.id);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const participants = chatData.participants || [];
        
        // Add user to participants if not already present
        if (!participants.includes(user.uid)) {
          await updateDoc(chatRef, {
            participants: arrayUnion(user.uid),
          });
        }
      }
      
      // Send the message
      await addDoc(collection(db, 'messages'), {
        chatId: currentChat.id,
        senderId: user.uid,
        senderName: userProfile.displayName || 'User',
        senderEmail: userProfile.email || undefined,
        senderPhone: userProfile.phone || undefined,
        text,
        type: 'text',
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [currentChat, user, userProfile]);

  const sendLocationMessage = useCallback(async () => {
    if (!currentChat || !user || !userProfile || !location) return;
    
    // Check if chat is still active
    if (!currentChat.activeStatus) {
      toast({
        title: "Chat Ended",
        description: "This emergency chat has ended.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Ensure user is in participants before sending
      const chatRef = doc(db, 'chats', currentChat.id);
      const chatSnap = await getDoc(chatRef);
      
      if (chatSnap.exists()) {
        const chatData = chatSnap.data();
        const participants = chatData.participants || [];
        
        // Add user to participants if not already present
        if (!participants.includes(user.uid)) {
          await updateDoc(chatRef, {
            participants: arrayUnion(user.uid),
          });
        }
      }
      
      await addDoc(collection(db, 'messages'), {
        chatId: currentChat.id,
        senderId: user.uid,
        senderName: userProfile.displayName || 'User',
        text: `📍 Current location: https://maps.google.com/?q=${location.latitude},${location.longitude}`,
        type: 'location',
        lat: location.latitude,
        lng: location.longitude,
        timestamp: serverTimestamp(),
      });
      
      toast({
        title: "Location Shared",
        description: "Your current location has been shared in the chat.",
      });
    } catch (error) {
      console.error('Error sending location:', error);
      toast({
        title: "Error",
        description: "Failed to share location",
        variant: "destructive",
      });
    }
  }, [currentChat, user, userProfile, location]);

  const joinEmergencyChat = useCallback(async (emergency: EmergencyAlert) => {
    if (!user || !emergency.chatId) return;
    
    try {
      const chatRef = doc(db, 'chats', emergency.chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data() as Chat;
        
        // Add user to participants using arrayUnion to avoid overwrites
        if (!chatData.participants?.includes(user.uid)) {
          await updateDoc(chatRef, {
            participants: arrayUnion(user.uid)
          });
          
          // Add join message
          await addDoc(collection(db, 'messages'), {
            chatId: emergency.chatId,
            senderId: 'system',
            senderName: 'System',
            text: `👋 ${userProfile?.displayName || 'A helper'} has joined to help`,
            timestamp: serverTimestamp(),
          });
        }
        
        setCurrentChat({
          id: chatDoc.id,
          ...chatData,
          participants: [...chatData.participants, user.uid]
        });
      }
    } catch (error) {
      console.error('Error joining chat:', error);
      toast({
        title: "Error",
        description: "Failed to join emergency chat",
        variant: "destructive",
      });
    }
  }, [user, userProfile]);

  const registerRapidTap = useCallback(() => {
    if (rapidTapTimeoutRef.current) {
      clearTimeout(rapidTapTimeoutRef.current);
    }
    
    setRapidTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        setShowConfirmation(true);
        return 0;
      }
      return newCount;
    });
    
    rapidTapTimeoutRef.current = setTimeout(() => {
      setRapidTapCount(0);
    }, 1500);
  }, []);

  const cancelSOS = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationTimeout(5);
    setSosHoldProgress(0);
    setRapidTapCount(0);
  }, []);

  return (
    <EmergencyContext.Provider value={{
      isEmergencyActive,
      currentEmergency,
      location,
      contacts,
      nearbyAlerts,
      currentChat,
      chatMessages,
      locationError,
      isLoadingLocation,
      chatHelpers,
      locationPermissionGranted,
      
      triggerEmergency,
      resolveEmergency,
      updateLocation,
      addContact,
      removeContact,
      sendChatMessage,
      sendLocationMessage,
      joinEmergencyChat,
      checkLocationPermission,
      
      sosHoldProgress,
      setSosHoldProgress,
      showConfirmation,
      setShowConfirmation,
      confirmationTimeout,
      rapidTapCount,
      registerRapidTap,
      cancelSOS,
    }}>
      {children}
    </EmergencyContext.Provider>
  );
};

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within EmergencyProvider');
  }
  return context;
};
