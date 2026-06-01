import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export type UserRole = 'admin' | 'manager' | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserObj: (() => void) | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (unsubscribeUserObj) {
        unsubscribeUserObj();
        unsubscribeUserObj = null;
      }
      
      if (firebaseUser) {
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          if (tokenResult.claims.aud !== firebaseConfig.projectId) {
            console.warn("Token audience mismatch. Signing out old project user...");
            await signOut(auth);
            return;
          }

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeUserObj = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUser({
                id: firebaseUser.uid,
                name: data.name || firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                role: data.role as UserRole,
                companyId: data.companyId || 'default-company',
              });
            } else {
              console.warn('User record missing in Firestore for UID:', firebaseUser.uid);
            }
            setLoading(false);
          }, (err) => {
            console.error('Error fetching user data from snapshot:', err);
            setLoading(false);
          });
          
        } catch (err) {
          console.error('Error setting up user listener:', err);
          setUser(null);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserObj) unsubscribeUserObj();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
