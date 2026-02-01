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
  getDoc
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
  status: 'active' | 'resolved';
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
}

export interface Chat {
  id: string;
  emergencyId: string;
  participants: string[];
  activeStatus: boolean;
  createdAt: any;
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
  
  // Actions
  triggerEmergency: () => Promise<void>;
  resolveEmergency: () => Promise<void>;
  updateLocation: () => Promise<Location | null>;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;
  joinEmergencyChat: (emergency: EmergencyAlert) => Promise<void>;
  
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

// Expanding radius search: 5km -> 10km -> 20km
const SEARCH_RADII = [5, 10, 20];

const findNearbyUsers = async (
  lat: number, 
  lng: number, 
  currentUserId: string
): Promise<{ users: NearbyUser[], radius: number }> => {
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  
  for (const radius of SEARCH_RADII) {
    const nearbyUsers: NearbyUser[] = [];
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (doc.id === currentUserId) return;
      if (!userData.lat || !userData.lng) return;
      
      const distance = calculateDistance(lat, lng, userData.lat, userData.lng);
      if (distance <= radius) {
        nearbyUsers.push({
          id: doc.id,
          email: userData.email || null,
          phone: userData.phone || null,
          displayName: userData.displayName || 'Helper',
          lat: userData.lat,
          lng: userData.lng,
          distance,
          lastUpdated: userData.lastUpdated,
        });
      }
    });
    
    if (nearbyUsers.length > 0) {
      return { users: nearbyUsers, radius };
    }
  }
  
  return { users: [], radius: 20 };
};

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
  
  // SOS Button State
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(5);
  const [rapidTapCount, setRapidTapCount] = useState(0);
  const rapidTapTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Subscribe to user's active emergency
  useEffect(() => {
    if (!user) return;

    const emergenciesRef = collection(db, 'emergencies');
    const q = query(
      emergenciesRef,
      where('victimId', '==', user.uid),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const emergencyDoc = snapshot.docs[0];
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
      where('status', '==', 'active')
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
      // 1. Create emergency document with all required fields
      const emergencyData = {
        victimId: user.uid,
        victimName: userProfile.displayName || 'User',
        victimEmail: userProfile.email || null,
        victimPhone: userProfile.phone || null,
        lat,
        lng,
        status: 'active',
        timestamp: serverTimestamp(),
        languagePreference: language,
      };
      
      const emergencyRef = await addDoc(collection(db, 'emergencies'), emergencyData);
      console.log('Emergency created:', emergencyRef.id);
      
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
      
      // 4. Find nearby users with expanding radius
      const { users: nearbyUsers, radius: foundRadius } = await findNearbyUsers(lat, lng, user.uid);
      
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
      // Update emergency status
      await updateDoc(doc(db, 'emergencies', currentEmergency.id), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
      });
      
      // Close the chat (set activeStatus to false)
      if (currentChat) {
        await updateDoc(doc(db, 'chats', currentChat.id), {
          activeStatus: false,
        });
        
        // Add system message
        await addDoc(collection(db, 'messages'), {
          chatId: currentChat.id,
          senderId: 'system',
          senderName: 'System',
          text: '✅ Emergency has been resolved. Chat closed. Stay safe!',
          timestamp: serverTimestamp(),
        });
      }
      
      setIsEmergencyActive(false);
      setCurrentEmergency(null);
      setCurrentChat(null);
      
      toast({
        title: "Emergency Resolved",
        description: "Stay safe! The emergency has been marked as resolved.",
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
    
    try {
      await addDoc(collection(db, 'messages'), {
        chatId: currentChat.id,
        senderId: user.uid,
        senderName: userProfile.displayName || 'User',
        senderEmail: userProfile.email || undefined,
        senderPhone: userProfile.phone || undefined,
        text,
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

  const joinEmergencyChat = useCallback(async (emergency: EmergencyAlert) => {
    if (!user || !emergency.chatId) return;
    
    try {
      const chatRef = doc(db, 'chats', emergency.chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data() as Chat;
        
        // Add user to participants if not already
        if (!chatData.participants.includes(user.uid)) {
          await updateDoc(chatRef, {
            participants: [...chatData.participants, user.uid]
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
      
      triggerEmergency,
      resolveEmergency,
      updateLocation,
      addContact,
      removeContact,
      sendChatMessage,
      joinEmergencyChat,
      
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
