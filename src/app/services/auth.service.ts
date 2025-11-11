import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getAuth
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private auth: Auth;
  private router = inject(Router);
  private ngZone = inject(NgZone);

  constructor() {
    this.auth = getAuth();
    this.initializeAuth();
  }

  private initializeAuth(): void {
    onAuthStateChanged(this.auth, (firebaseUser) => {
      this.ngZone.run(() => {
        if (firebaseUser) {
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified
          };
          this.currentUserSubject.next(user);
          localStorage.setItem('firebaseUser', JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName }));
        } else {
          this.currentUserSubject.next(null);
          localStorage.removeItem('firebaseUser');
        }
      });
    });
  }

  public async registerWithEmail(email: string, password: string, name?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      if (!userCredential.user) {
        throw new Error('Registration failed: no user returned');
      }
      if (name) {
        await updateProfile(userCredential.user, { displayName: name });
      }
      await sendEmailVerification(userCredential.user);
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  public async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      if (!userCredential.user) {
        throw new Error('Login failed: no user returned');
      }
      if (!userCredential.user.emailVerified) {
        throw new Error('Email not verified');
      }
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  public async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(this.auth, provider);
      if (!userCredential?.user) {
        throw new Error('Google sign-in failed: no user returned');
      }
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('Error during Google sign-in:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
      localStorage.removeItem('firebaseUser');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  public async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  public async getFirebaseUser(): Promise<any> {
    return this.auth.currentUser;
  }
}