import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChange, signInWithGoogle, signOut as firebaseSignOut, type User } from '@/services/firebase';
import { getUserProfile } from '@/services/firestore';
import { useNotification } from '../context/NotificationContext';
import type { UserProfile, UserRole } from '@/types/auth';
import { ROUTES } from '@/types/routes';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user profile from Firestore
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);

          // If user exists but no profile, redirect to role selection
          if (!profile) {
            console.log('🔄 New user detected, redirecting to role selection');
            navigate('/role-selection');
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [navigate]);

  const signIn = async () => {
    try {
      setLoading(true);
      const firebaseUser = await signInWithGoogle();
      setUser(firebaseUser);
      showNotification('Signed in successfully', 'success');
    } catch (error: any) {
      console.error('Sign in error:', error);
      showNotification(error.message || 'Failed to sign in', 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut();
      setUser(null);
      setUserProfile(null);
      showNotification('Signed out successfully', 'success');
    } catch (error: any) {
      console.error('Sign out error:', error);
      showNotification(error.message || 'Failed to sign out', 'error');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    role: userProfile?.role || null,
    isAdmin: userProfile?.role === 'admin',
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
