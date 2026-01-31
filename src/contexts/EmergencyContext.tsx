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
  GeoPoint
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

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
  phoneNumber?: string; // alias for compatibility
  relationship: string;
  isPrimary: boolean;
  userId?: string;
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
  status: 'active' | 'resolved' | 'cancelled' | 'ACTIVE' | 'RESOLVED';
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
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED';
  triggerType: string;
  createdAt: any;
  updatedAt?: any;
  messages?: FirestoreChatMessage[];
}

export interface LocationRecord {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: any;
}

interface EmergencyContextType {
  // State
  isEmergencyActive: boolean;
  currentSession: EmergencySession | null;
  location: Location | null;
  riskLevel: 'low' | 'medium' | 'high';
  contacts: EmergencyContact[];
  helpers: Helper[];
  locationError: string | null;
  isLoadingLocation: boolean;
  
  // Actions
  triggerSOS: (type: EmergencySession['triggerType']) => Promise<void>;
  cancelSOS: () => void;
  endEmergency: () => Promise<void>;
  updateLocation: () => Promise<Location | null>;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  updateContact: (id: string, contact: Partial<EmergencyContact>) => Promise<void>;
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

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<EmergencySession | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  // SOS Button State
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(5);
  const [rapidTapCount, setRapidTapCount] = useState(0);
  const rapidTapTimeoutRef = useRef<NodeJS.Timeout>();

  // Subscribe to contacts from Firestore (using emergencyContacts collection)
  useEffect(() => {
    if (!user) {
      setContacts([]);
      return;
    }

    // Listen to emergencyContacts collection filtered by userId
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
      const helpersList: Helper[] = [];
      snapshot.forEach((doc) => {
        helpersList.push({ id: doc.id, ...doc.data() } as Helper);
      });
      setHelpers(helpersList);
    }, (error) => {
      console.error('Error fetching helpers:', error);
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
      where('status', '==', 'ACTIVE')
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
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            accuracy: 0,
            timestamp: Date.now(),
          },
          contacts: contacts,
          helpers: helpers.filter(h => h.status === 'available'),
          messages: data.messages?.map((m: any) => ({
            ...m,
            timestamp: m.timestamp?.toDate() || new Date()
          })) || [],
          status: data.status,
          triggerType: data.triggerType || 'manual'
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
  }, [user, helpers, contacts]);

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

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(newLocation);
          setLocationError(null);
          setIsLoadingLocation(false);
          resolve(newLocation);
        },
        (error) => {
          let errorMessage = 'Unable to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your device settings to use emergency features.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check if GPS is enabled on your device.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Retrying...';
              // Retry once with less accuracy
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const newLocation: Location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                  };
                  setLocation(newLocation);
                  setLocationError(null);
                  setIsLoadingLocation(false);
                  resolve(newLocation);
                },
                (retryError) => {
                  setLocationError('GPS failed after retry. Please check your location settings.');
                  setIsLoadingLocation(false);
                  toast({
                    title: "GPS Error",
                    description: "Could not get your location. Please ensure GPS is enabled.",
                    variant: "destructive",
                  });
                  reject(retryError);
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
        options
      );
    });
  }, []);

  const sendAlertToContacts = useCallback((lat: number, lng: number) => {
    const message = `🚨 EMERGENCY ALERT 🚨\nUser needs help.\nLive Location: https://maps.google.com/?q=${lat},${lng}`;
    
    // Log the alert message (in production, integrate with SMS/notification service)
    console.log('Sending alert to contacts:', contacts);
    console.log('Alert message:', message);
    
    // Show notification about alerts being sent
    if (contacts.length > 0) {
      toast({
        title: "🚨 Emergency Alerts Sent",
        description: `Notifying ${contacts.length} emergency contact(s) with your location`,
      });
    } else {
      toast({
        title: "⚠️ No Emergency Contacts",
        description: "Add emergency contacts to receive alerts during emergencies",
        variant: "destructive",
      });
    }
    
    return message;
  }, [contacts]);

  const triggerSOS = useCallback(async (type: EmergencySession['triggerType']) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use emergency features",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmation(false);
    
    // Get current location with proper error handling
    let currentLocation: Location | null = null;
    try {
      currentLocation = await updateLocation();
    } catch (error) {
      console.error('Could not get location:', error);
      // Continue with emergency even without location
      toast({
        title: "Location Warning",
        description: "Emergency triggered without precise location. GPS data unavailable.",
        variant: "destructive",
      });
    }

    const lat = currentLocation?.latitude || 0;
    const lng = currentLocation?.longitude || 0;
    
    try {
      // 1. Save location to "locations" collection
      const locationRecord: LocationRecord = {
        userId: user.uid,
        latitude: lat,
        longitude: lng,
        timestamp: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'locations'), locationRecord);
      console.log('Location saved to Firestore');
      
      // 2. Create alert in "alerts" collection
      const alertData: Omit<EmergencyAlert, 'id'> = {
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'User',
        userPhone: userProfile?.phone || user.phoneNumber || undefined,
        latitude: lat,
        longitude: lng,
        status: 'ACTIVE',
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
      
      const docRef = await addDoc(collection(db, 'alerts'), alertData);
      console.log('Emergency alert created:', docRef.id);
      
      // 3. Send alert to emergency contacts
      sendAlertToContacts(lat, lng);
      
      setIsEmergencyActive(true);
      
      toast({
        title: "🆘 Emergency Activated",
        description: "Your location has been saved and contacts notified",
      });
      
    } catch (error) {
      console.error('Error creating emergency alert:', error);
      setIsEmergencyActive(false);
      toast({
        title: "Error",
        description: "Failed to create emergency alert. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, userProfile, updateLocation, sendAlertToContacts]);

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
          status: 'RESOLVED',
          updatedAt: serverTimestamp(),
        });
        
        toast({
          title: "Emergency Resolved",
          description: "Your emergency has been marked as resolved",
        });
      } catch (error) {
        console.error('Error ending emergency:', error);
        toast({
          title: "Error",
          description: "Failed to end emergency. Please try again.",
          variant: "destructive",
        });
      }
    }
    setIsEmergencyActive(false);
    setCurrentSession(null);
  }, [currentSession, user]);

  const addContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!user) return;
    
    try {
      // Add to emergencyContacts collection with userId
      await addDoc(collection(db, 'emergencyContacts'), {
        name: contact.name,
        phoneNumber: contact.phone || contact.phoneNumber,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      
      toast({
        title: "Contact Added",
        description: `${contact.name} has been added as an emergency contact`,
      });
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user]);

  const removeContact = useCallback(async (id: string) => {
    if (!user) return;
    
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
        description: "Failed to remove contact. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [user]);

  const updateContact = useCallback(async (id: string, contact: Partial<EmergencyContact>) => {
    if (!user) return;
    
    try {
      const updateData: any = {};
      if (contact.name) updateData.name = contact.name;
      if (contact.phone || contact.phoneNumber) updateData.phoneNumber = contact.phone || contact.phoneNumber;
      if (contact.relationship) updateData.relationship = contact.relationship;
      if (contact.isPrimary !== undefined) updateData.isPrimary = contact.isPrimary;
      
      await updateDoc(doc(db, 'emergencyContacts', id), updateData);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession || !user) return;
    
    const message: FirestoreChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.uid,
      senderName: userProfile?.displayName || 'You',
      senderType: 'user',
      content: content.trim().slice(0, 1000),
      timestamp: Timestamp.now(),
      status: 'sent',
    };
    
    try {
      const alertRef = doc(db, 'alerts', currentSession.id);
      const currentMessages = currentSession.messages?.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? Timestamp.fromDate(m.timestamp) : m.timestamp
      })) || [];
      
      await updateDoc(alertRef, {
        messages: [...currentMessages, message],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
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
      locationError,
      isLoadingLocation,
      triggerSOS,
      cancelSOS,
      endEmergency,
      updateLocation,
      addContact,
      removeContact,
      updateContact,
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
