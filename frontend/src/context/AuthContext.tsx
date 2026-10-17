import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseClientConfigured } from '../config/firebase';
import { api } from '../services/api';
import { User, WorkerProfile, UserRole } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  workerProfile: WorkerProfile | null;
  loading: boolean;
  firebaseConfigured: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    pass: string;
    role: 'CUSTOMER' | 'WORKER';
    phone?: string;
    locality?: string;
    district?: string;
    state?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseClientConfigured();

  const fetchUserProfile = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setWorkerProfile(res.workerProfile || null);
        return res.user;
      }
    } catch (err) {
      console.warn('[AuthContext] Could not fetch profile from backend:', err);
    }
    return null;
  };

  useEffect(() => {
    if (!isConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          localStorage.setItem('workforce_token', token);
          await fetchUserProfile();
        } catch (e) {
          console.error('[AuthContext] Failed to retrieve user ID token:', e);
        }
      } else {
        localStorage.removeItem('workforce_token');
        setUser(null);
        setWorkerProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  const login = async (email: string, pass: string): Promise<User> => {
    if (!auth) {
      throw new Error('Firebase Auth is not configured. Please supply Firebase credentials in frontend/.env');
    }
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const token = await cred.user.getIdToken();
    localStorage.setItem('workforce_token', token);

    const profile = await fetchUserProfile();
    if (!profile) {
      throw new Error('User profile could not be loaded from Firestore.');
    }
    return profile;
  };

  const register = async (payload: {
    name: string;
    email: string;
    pass: string;
    role: 'CUSTOMER' | 'WORKER';
    phone?: string;
    locality?: string;
    district?: string;
    state?: string;
  }): Promise<User> => {
    if (!auth) {
      throw new Error('Firebase Auth is not configured. Please supply Firebase credentials in frontend/.env');
    }

    // 1. Create user in Firebase Authentication
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.pass);
    const token = await cred.user.getIdToken();
    localStorage.setItem('workforce_token', token);

    // 2. Initialize Firestore profile via authorized backend endpoint
    const regRes = await api.register({
      uid: cred.user.uid,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      phone: payload.phone,
      locality: payload.locality,
      district: payload.district,
      state: payload.state,
    });

    if (!regRes.success) {
      throw new Error(regRes.error || 'Failed to initialize profile in Firestore.');
    }

    setUser(regRes.user);
    await fetchUserProfile();
    return regRes.user;
  };

  const logout = async () => {
    if (auth) {
      await fbSignOut(auth);
    }
    localStorage.removeItem('workforce_token');
    setUser(null);
    setWorkerProfile(null);
  };

  const refreshProfile = async () => {
    await fetchUserProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        workerProfile,
        loading,
        firebaseConfigured: isConfigured,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
