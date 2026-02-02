import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  phone: string | null;
  displayName: string;
  name?: string;
  loginMethod: 'email' | 'phone' | 'google';
  lat?: number;
  lng?: number;
  lastUpdated?: any;
  lastActive?: any;
  isOnline?: boolean;
  createdAt: any;
  lastLogin?: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendOTP: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, otp: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateUserLocation: (lat: number, lng: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to create/update user profile in Firestore
  const createOrUpdateUserProfile = async (
    firebaseUser: User, 
    loginMethod: 'email' | 'phone' | 'google',
    displayName?: string
  ) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing user
      await setDoc(userRef, {
        lastLogin: serverTimestamp(),
        loginMethod,
      }, { merge: true });
      
      const existingData = userDoc.data() as UserProfile;
      setUserProfile({ ...existingData, loginMethod });
    } else {
      // Create new user profile with name field
      const name = displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || null,
        phone: firebaseUser.phoneNumber || null,
        displayName: name,
        name: name,
        loginMethod,
        isOnline: true,
        lastActive: serverTimestamp(),
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      
      await setDoc(userRef, profile);
      setUserProfile(profile);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
            // Update last login
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              lastLogin: serverTimestamp()
            }, { merge: true });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await createOrUpdateUserProfile(credential.user, 'email');
  };

  const signUp = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await createOrUpdateUserProfile(credential.user, 'email', name);
  };

  const signInWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleProvider);
    await createOrUpdateUserProfile(credential.user, 'google', credential.user.displayName || undefined);
  };

  const sendOTP = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    // Ensure phone number is in E.164 format for India
    const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : `+91${phoneNumber}`;
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    return confirmationResult;
  };

  const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string, name?: string) => {
    const credential = await confirmationResult.confirm(otp);
    
    // Update display name if provided
    if (name && credential.user) {
      await updateProfile(credential.user, { displayName: name });
    }
    
    await createOrUpdateUserProfile(credential.user, 'phone', name);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    await setDoc(doc(db, 'users', user.uid), data, { merge: true });
    setUserProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const updateUserLocation = async (lat: number, lng: number) => {
    if (!user) return;
    
    const locationData = {
      lat,
      lng,
      lastUpdated: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', user.uid), locationData, { merge: true });
    setUserProfile(prev => prev ? { ...prev, ...locationData } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      sendOTP,
      verifyOTP,
      logout,
      resetPassword,
      updateUserProfile,
      updateUserLocation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
