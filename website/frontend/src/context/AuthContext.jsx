import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import axios from 'axios';

const AuthContext = createContext(null);
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get fresh token and set on axios BEFORE marking loading=false
        const token = await firebaseUser.getIdToken(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser({
          id:    firebaseUser.uid,
          email: firebaseUser.email,
          name:  firebaseUser.displayName || firebaseUser.email,
          role:  'teacher',
        });
      } else {
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Refresh token every 50 minutes (Firebase tokens expire at 60 min)
  useEffect(() => {
    const interval = setInterval(async () => {
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken(true);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const u = {
      id:    cred.user.uid,
      email: cred.user.email,
      name:  cred.user.displayName || cred.user.email,
      role:  'teacher',
    };
    setUser(u);
    return u;
  };

  const signup = async (name, email, password) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const token = await cred.user.getIdToken(true);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const u = {
      id:    cred.user.uid,
      email: cred.user.email,
      name,
      role:  'teacher',
    };
    setUser(u);
    return u;
  };

  const logout = async () => {
    await signOut(auth);
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);