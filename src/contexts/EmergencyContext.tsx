import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

// Mock helpers for demo
const MOCK_HELPERS: Helper[] = [
  { id: '1', name: 'Rahul Sharma', phone: '+91 98765 43210', status: 'available', distance: 0.5, eta: 3, avatar: '' },
  { id: '2', name: 'Priya Patel', phone: '+91 87654 32109', status: 'available', distance: 1.2, eta: 7, avatar: '' },
  { id: '3', name: 'Amit Kumar', phone: '+91 76543 21098', status: 'busy', distance: 2.0, eta: 12, avatar: '' },
];

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<EmergencySession | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [helpers] = useState<Helper[]>(MOCK_HELPERS);
  
  // SOS Button State
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(5);
  const [rapidTapCount, setRapidTapCount] = useState(0);
  const rapidTapTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Load contacts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('emergency-contacts');
    if (saved) {
      setContacts(JSON.parse(saved));
    }
  }, []);

  // Save contacts to localStorage
  useEffect(() => {
    localStorage.setItem('emergency-contacts', JSON.stringify(contacts));
  }, [contacts]);

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
      // Auto-trigger SOS on timeout (no response = danger)
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

  const triggerSOS = useCallback((type: EmergencySession['triggerType']) => {
    setShowConfirmation(false);
    setIsEmergencyActive(true);
    
    const session: EmergencySession = {
      id: `sos-${Date.now()}`,
      startTime: new Date(),
      location: location || { latitude: 0, longitude: 0, accuracy: 0, timestamp: Date.now() },
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
        timestamp: new Date(),
      }],
      status: 'active',
      triggerType: type,
    };
    
    setCurrentSession(session);
    updateLocation();
    
    // In production: Send real notifications, SMS, etc.
    console.log('SOS Triggered:', session);
  }, [location, contacts, helpers, updateLocation]);

  const cancelSOS = useCallback(() => {
    setShowConfirmation(false);
    setConfirmationTimeout(5);
    setSosHoldProgress(0);
    setRapidTapCount(0);
  }, []);

  const endEmergency = useCallback(() => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        endTime: new Date(),
        status: 'resolved',
      });
    }
    setIsEmergencyActive(false);
    setCurrentSession(null);
  }, [currentSession]);

  const addContact = useCallback((contact: Omit<EmergencyContact, 'id'>) => {
    const newContact: EmergencyContact = {
      ...contact,
      id: `contact-${Date.now()}`,
    };
    setContacts(prev => [...prev, newContact]);
  }, []);

  const removeContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!currentSession) return;
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'user',
      senderName: 'You',
      senderType: 'user',
      content,
      timestamp: new Date(),
      status: 'sent',
    };
    
    setCurrentSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, message],
    } : null);
  }, [currentSession]);

  const registerRapidTap = useCallback(() => {
    setRapidTapCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        // Trigger immediate SOS
        triggerSOS('rapid');
        return 0;
      }
      return newCount;
    });

    // Reset count after 2 seconds of no taps
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
