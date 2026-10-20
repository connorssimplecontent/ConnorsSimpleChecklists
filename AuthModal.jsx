import React, { useState } from 'react';
import { auth, googleProvider } from '../../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';

export default function AuthModal({ isOpen, onClose, onNameSet }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const unavailable = 'Login is unavailable: Firebase is not configured (see .env.example). You can keep using the app in guest mode.';

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!auth) { setError(unavailable); return; }
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = name.trim().slice(0, 60);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
          onNameSet?.(displayName);
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) { setError(unavailable); return; }
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 op-backdrop flex items-center justify-center p-4 z-50">
      <div className="op-modal p-6 max-w-md w-full">
        <h2 className="op-modal-title text-xl font-bold mb-1">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <p className="text-xs opacity-75 mb-4">Sign in to sync your checklists and share them with other people using the app.</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Your name (shown to people you share with)"
              className="w-full p-2 rounded border bg-transparent"
              value={name}
              maxLength={60}
              onChange={e => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 rounded border bg-transparent"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 rounded border bg-transparent"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="w-full py-2 op-btn-primary font-semibold rounded">
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        <button onClick={handleGoogleSignIn} className="w-full mt-3 py-2 op-btn-secondary font-semibold">
          Continue with Google
        </button>
        <div className="mt-4 text-center">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm underline">
            {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full text-sm opacity-70">Cancel</button>
      </div>
    </div>
  );
}
