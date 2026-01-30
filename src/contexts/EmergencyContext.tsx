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
  setDoc
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

interface EmergencyContextType {
  // State
  isEmergencyActive: boolean;
  currentSession: EmergencySession | null;
  location: Location | null;
  riskLevel: 'low' | 'medium' | 'high';
  contacts: EmergencyContact[];
  helpers: Helper[];
  
  // Actions
  triggerSOS: (type: EmergencySession['triggerType']) => void;
  cancelSOS: () => void;
  endEmergency: () => void;
  updateLocation: () => Promise<void>;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  removeContact: (id: string) => void;
  sendMessage: (content: string) => void;
  
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
  const { user } = useAuth();
  
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
    });

    return unsubscribe;
  }, []);

  // Subscribe to active emergency session
  useEffect(() => {
    if (!user) return;

    const sessionsRef = collection(db, 'emergencies');
    const q = query(
      sessionsRef, 
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const sessionDoc = snapshot.docs[0];
        const data = sessionDoc.data();
        setCurrentSession({
          id: sessionDoc.id,
          ...data,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate(),
          messages: data.messages?.map((m: any) => ({
            ...m,
            timestamp: m.timestamp?.toDate() || new Date()
          })) || []
        } as EmergencySession);
        setIsEmergencyActive(true);
      } else {
        setCurrentSession(null);
        setIsEmergencyActive(false);
      }
    });

    return unsubscribe;
  }, [user]);

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

  const updateLocation = useCallback(async () => {
    return new Promise<void>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
          resolve();
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
    if (!user) return;
    
    setShowConfirmation(false);
    setIsEmergencyActive(true);
    
    const currentLocation = location || { latitude: 0, longitude: 0, accuracy: 0, timestamp: Date.now() };
    
    const sessionData = {
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName || 'User',
      startTime: Timestamp.now(),
      location: currentLocation,
      contacts,
      helpers: helpers.filter(h => h.status === 'available'),
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
      }],
      status: 'active',
      triggerType: type,
    };
    
    try {
      const docRef = await addDoc(collection(db, 'emergencies'), sessionData);
      console.log('Emergency created:', docRef.id);
      updateLocation();
    } catch (error) {
      console.error('Error creating emergency:', error);
    }
  }, [user, location, contacts, helpers, updateLocation]);

  const cancelSOS = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationTimeout(5);
    setSosHoldProgress(0);
    setRapidTapCount(0);
  }, []);

  const endEmergency = useCallback(async () => {
    if (currentSession) {
      try {
        await updateDoc(doc(db, 'emergencies', currentSession.id), {
          endTime: Timestamp.now(),
          status: 'resolved',
        });
      } catch (error) {
        console.error('Error ending emergency:', error);
      }
    }
    setIsEmergencyActive(false);
    setCurrentSession(null);
  }, [currentSession]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'contacts'), contact);
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  }, [user]);

  const removeContact = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'contacts', id));
    } catch (error) {
      console.error('Error removing contact:', error);
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession || !user) return;
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.uid,
      senderName: user.displayName || 'You',
      senderType: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
    };
    
    try {
      const currentMessages = currentSession.messages || [];
      await updateDoc(doc(db, 'emergencies', currentSession.id), {
        messages: [...currentMessages, {
          ...message,
          timestamp: Timestamp.fromDate(message.timestamp)
        }]
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [currentSession, user]);

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
