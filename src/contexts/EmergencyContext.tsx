import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  GeoPoint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export interface Helper {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  status: 'available' | 'busy' | 'offline';
  distance?: number;
  eta?: number;
  location?: Location;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'helper' | 'contact' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export interface EmergencySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  location: Location;
  contacts: EmergencyContact[];
  helpers: Helper[];
  messages: ChatMessage[];
  status: 'active' | 'resolved' | 'cancelled';
  triggerType: 'manual' | 'rapid' | 'voice' | 'auto' | 'panic';
}

export interface FirestoreChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'helper' | 'contact' | 'system';
  content: string;
  timestamp: Timestamp;
  status?: 'sent' | 'delivered' | 'read';
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  location: {
    geopoint: GeoPoint;
    accuracy: number;
    address?: string;
  };
  contacts: EmergencyContact[];
  status: 'active' | 'resolved' | 'cancelled';
  triggerType: string;
  createdAt: any;
  updatedAt: any;
  messages: FirestoreChatMessage[];
}

interface EmergencyContextType {
  // State
  isEmergencyActive: boolean;
  currentSession: EmergencySession | null;
  location: Location | null;
  riskLevel: 'low' | 'medium' | 'high';
  contacts: EmergencyContact[];
  helpers: Helper[];
  
  // Actions
  triggerSOS: (type: EmergencySession['triggerType']) => Promise<void>;
  cancelSOS: () => void;
  endEmergency: () => Promise<void>;
  updateLocation: () => Promise<Location | null>;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  
  // SOS Button State
  sosHoldProgress: number;
  setSosHoldProgress: (progress: number) => void;
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;
  confirmationTimeout: number;
  rapidTapCount: number;
  registerRapidTap: () => void;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

// Mock helpers for demo (will be replaced with real data from Firestore)
const MOCK_HELPERS: Helper[] = [
  { id: '1', name: 'Rahul Sharma', phone: '+91 98765 43210', status: 'available', distance: 0.5, eta: 3, avatar: '' },
  { id: '2', name: 'Priya Patel', phone: '+91 87654 32109', status: 'available', distance: 1.2, eta: 7, avatar: '' },
  { id: '3', name: 'Amit Kumar', phone: '+91 76543 21098', status: 'busy', distance: 2.0, eta: 12, avatar: '' },
];

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<EmergencySession | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>(MOCK_HELPERS);
  
  // SOS Button State
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(5);
  const [rapidTapCount, setRapidTapCount] = useState(0);
  const rapidTapTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Subscribe to contacts from Firestore
  useEffect(() => {
    if (!user) {
      setContacts([]);
      return;
    }

    const contactsRef = collection(db, 'users', user.uid, 'contacts');
    const unsubscribe = onSnapshot(contactsRef, (snapshot) => {
      const contactsList: EmergencyContact[] = [];
      snapshot.forEach((doc) => {
        contactsList.push({ id: doc.id, ...doc.data() } as EmergencyContact);
      });
      setContacts(contactsList);
    }, (error) => {
      console.error('Error fetching contacts:', error);
    });

    return unsubscribe;
  }, [user]);

  // Subscribe to helpers from Firestore
  useEffect(() => {
    const helpersRef = collection(db, 'helpers');
    const q = query(helpersRef, where('status', 'in', ['available', 'busy']));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Keep mock helpers if no real data
        setHelpers(MOCK_HELPERS);
        return;
      }
      
      const helpersList: Helper[] = [];
      snapshot.forEach((doc) => {
        helpersList.push({ id: doc.id, ...doc.data() } as Helper);
      });
      setHelpers(helpersList);
    }, (error) => {
      console.error('Error fetching helpers:', error);
      setHelpers(MOCK_HELPERS);
    });

    return unsubscribe;
  }, []);

  // Subscribe to active emergency alerts
  useEffect(() => {
    if (!user) return;

    const alertsRef = collection(db, 'alerts');
    const q = query(
      alertsRef, 
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const alertDoc = snapshot.docs[0];
        const data = alertDoc.data();
        setCurrentSession({
          id: alertDoc.id,
          startTime: data.createdAt?.toDate() || new Date(),
          endTime: data.updatedAt?.toDate(),
          location: {
            latitude: data.location?.geopoint?.latitude || 0,
            longitude: data.location?.geopoint?.longitude || 0,
            accuracy: data.location?.accuracy || 0,
            timestamp: Date.now(),
            address: data.location?.address
          },
          contacts: data.contacts || [],
          helpers: helpers.filter(h => h.status === 'available'),
          messages: data.messages?.map((m: any) => ({
            ...m,
            timestamp: m.timestamp?.toDate() || new Date()
          })) || [],
          status: data.status,
          triggerType: data.triggerType
        } as EmergencySession);
        setIsEmergencyActive(true);
      } else {
        setCurrentSession(null);
        setIsEmergencyActive(false);
      }
    }, (error) => {
      console.error('Error fetching alerts:', error);
    });

    return unsubscribe;
  }, [user, helpers]);

  // Calculate risk level based on time and location
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 5) {
      setRiskLevel('high');
    } else if (hour >= 18 || hour < 7) {
      setRiskLevel('medium');
    } else {
      setRiskLevel('low');
    }
  }, []);

  // Confirmation countdown
  useEffect(() => {
    if (showConfirmation && confirmationTimeout > 0) {
      const timer = setTimeout(() => {
        setConfirmationTimeout(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showConfirmation && confirmationTimeout === 0) {
      triggerSOS('auto');
    }
  }, [showConfirmation, confirmationTimeout]);

  const updateLocation = useCallback(async (): Promise<Location | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(newLocation);
          resolve(newLocation);
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const triggerSOS = useCallback(async (type: EmergencySession['triggerType']) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    setShowConfirmation(false);
    setIsEmergencyActive(true);
    
    // Get current location
    let currentLocation = location;
    try {
      currentLocation = await updateLocation();
    } catch (error) {
      console.error('Could not get location:', error);
    }

    const finalLocation = currentLocation || { latitude: 0, longitude: 0, accuracy: 0, timestamp: Date.now() };
    
    // Create alert in Firestore
    const alertData: Omit<EmergencyAlert, 'id'> = {
      userId: user.uid,
      userName: userProfile?.displayName || user.displayName || 'User',
      userPhone: userProfile?.phone || user.phoneNumber || undefined,
      location: {
        geopoint: new GeoPoint(finalLocation.latitude, finalLocation.longitude),
        accuracy: finalLocation.accuracy,
        address: finalLocation.address
      },
      contacts: contacts,
      status: 'active',
      triggerType: type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messages: [{
        id: `msg-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        senderType: 'system',
        content: type === 'auto' 
          ? '⚠️ Emergency auto-triggered - User did not respond'
          : type === 'rapid' 
          ? '🚨 Rapid SOS activated - Extreme emergency'
          : type === 'voice'
          ? '🎤 Voice-activated emergency'
          : '🆘 SOS Alert activated',
        timestamp: Timestamp.now(),
        status: 'sent'
      }]
    };
    
    try {
      const docRef = await addDoc(collection(db, 'alerts'), alertData);
      console.log('Emergency alert created:', docRef.id);
      
      // Also save to user's alert history
      await setDoc(doc(db, 'users', user.uid, 'alertHistory', docRef.id), {
        alertId: docRef.id,
        createdAt: serverTimestamp(),
        triggerType: type,
        status: 'active'
      });
      
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      setIsEmergencyActive(false);
    }
  }, [user, userProfile, location, contacts, updateLocation]);

  const cancelSOS = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationTimeout(5);
    setSosHoldProgress(0);
    setRapidTapCount(0);
  }, []);

  const endEmergency = useCallback(async () => {
    if (currentSession && user) {
      try {
        await updateDoc(doc(db, 'alerts', currentSession.id), {
          status: 'resolved',
          updatedAt: serverTimestamp(),
        });
        
        // Update user's alert history
        await updateDoc(doc(db, 'users', user.uid, 'alertHistory', currentSession.id), {
          status: 'resolved',
          resolvedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error ending emergency:', error);
      }
    }
    setIsEmergencyActive(false);
    setCurrentSession(null);
  }, [currentSession, user]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'contacts'), {
        ...contact,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }, [user]);

  const removeContact = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'contacts', id));
    } catch (error) {
      console.error('Error removing contact:', error);
      throw error;
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession || !user) return;
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.uid,
      senderName: userProfile?.displayName || 'You',
      senderType: 'user',
      content: content.trim().slice(0, 1000), // Limit message length
      timestamp: new Date(),
      status: 'sent',
    };
    
    try {
      const currentMessages = currentSession.messages || [];
      const messagesForFirestore = [...currentMessages, message].map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? Timestamp.fromDate(m.timestamp) : m.timestamp
      }));
      
      await updateDoc(doc(db, 'alerts', currentSession.id), {
        messages: messagesForFirestore,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [currentSession, user, userProfile]);

  const registerRapidTap = useCallback(() => {
    setRapidTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        triggerSOS('rapid');
        return 0;
      }
      return newCount;
    });

    if (rapidTapTimeoutRef.current) {
      clearTimeout(rapidTapTimeoutRef.current);
    }
    rapidTapTimeoutRef.current = setTimeout(() => {
      setRapidTapCount(0);
    }, 2000);
  }, [triggerSOS]);

  return (
    <EmergencyContext.Provider value={{
      isEmergencyActive,
      currentSession,
      location,
      riskLevel,
      contacts,
      helpers,
      triggerSOS,
      cancelSOS,
      endEmergency,
      updateLocation,
      addContact,
      removeContact,
      sendMessage,
      sosHoldProgress,
      setSosHoldProgress,
      showConfirmation,
      setShowConfirmation,
      confirmationTimeout,
      rapidTapCount,
      registerRapidTap,
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
