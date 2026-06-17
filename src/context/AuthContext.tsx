import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { UserProfile, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserProfile;
            setState({ user: userData, loading: false, error: null });
          } else {
            setState({ user: null, loading: false, error: 'Usuário não encontrado' });
          }
        } catch {
          setState({ user: null, loading: false, error: 'Erro ao carregar perfil do usuário' });
        }
      } else {
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        if (!userData.isActive) {
          await signOut(auth);
          setState({ user: null, loading: false, error: 'Usuário inativo. Contate o administrador.' });
          return;
        }
        setState({ user: userData, loading: false, error: null });
      } else {
        await signOut(auth);
        setState({ user: null, loading: false, error: 'Usuário não encontrado no sistema' });
      }
    } catch (error: unknown) {
      let errorMessage = 'Erro ao fazer login';
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
          errorMessage = 'E-mail ou senha incorretos';
        } else if (errorCode === 'auth/user-not-found') {
          errorMessage = 'Usuário não encontrado';
        } else if (errorCode === 'auth/invalid-email') {
          errorMessage = 'E-mail inválido';
        } else if (errorCode === 'auth/too-many-requests') {
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
        }
      }
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setState({ user: null, loading: false, error: null });
    } catch {
      setState(prev => ({ ...prev, error: 'Erro ao sair' }));
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
