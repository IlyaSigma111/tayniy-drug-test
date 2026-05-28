import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const actionCodeSettings = {
  url: `${window.location.origin}/tayniy-drug/#/login`,
  handleCodeInApp: false
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signup = async (email, password, fullName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user, actionCodeSettings);
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      fullName,
      region: '',
      bio: '',
      profilePhoto: '',
      profileCompleted: false,
      createdAt: new Date().toISOString()
    });
    return userCredential;
  };

  const resendVerification = async () => {
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser, actionCodeSettings);
    }
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  const updateProfile = async (data) => {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.uid), data, { merge: true });
  };

  const getUserProfile = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user ? { ...user } : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateProfile,
    getUserProfile,
    resendVerification,
    emailVerified: currentUser?.emailVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
