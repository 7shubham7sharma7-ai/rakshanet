import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    confirmationResult: ConfirmationResult;
  }
}

export interface UserProfile {
  uid: string;
  email?: string;
  phone?: string;
  displayName: string;
  language?: string;
  createdAt: any;
  lastLogin?: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  sendPhoneOTP: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>;
  verifyPhoneOTP: (otp: string, name?: string) => Promise<void>;
  isNewPhoneUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewPhoneUser, setIsNewPhoneUser] = useState(false);

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
    await setDoc(doc(db, 'users', credential.user.uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });
  };

  const signUp = async (email: string, password: string, name: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(credential.user, { displayName: name });
    
    const profile: UserProfile = {
      uid: credential.user.uid,
      email: email,
      displayName: name,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };
    
    await setDoc(doc(db, 'users', credential.user.uid), profile);
    setUserProfile(profile);
  };

  const sendPhoneOTP = async (phoneNumber: string, recaptchaContainerId: string) => {
    try {
      // Clean up existing verifier
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });

      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, window.recaptchaVerifier);
      window.confirmationResult = confirmationResult;
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const verifyPhoneOTP = async (otp: string, name?: string) => {
    if (!window.confirmationResult) {
      throw new Error('No confirmation result found. Please request OTP again.');
    }

    const result = await window.confirmationResult.confirm(otp);
    const firebaseUser = result.user;

    // Check if user profile exists
    const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!profileDoc.exists()) {
      // New user - create profile
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        phone: firebaseUser.phoneNumber || undefined,
        displayName: name || 'User',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), profile);
      setUserProfile(profile);
      
      if (name) {
        await updateProfile(firebaseUser, { displayName: name });
      }
    } else {
      setUserProfile(profileDoc.data() as UserProfile);
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
    }
    
    setIsNewPhoneUser(false);
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

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      logout,
      resetPassword,
      updateUserProfile,
      sendPhoneOTP,
      verifyPhoneOTP,
      isNewPhoneUser,
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
