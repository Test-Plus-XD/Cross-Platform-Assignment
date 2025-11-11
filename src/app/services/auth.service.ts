import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from '@angular/fire/auth';
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
  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  constructor() {
    this.initialiseAuth();
  }

  // Initialise authentication state listener
  private initialiseAuth(): void {
    onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
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
          localStorage.setItem('firebaseUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          }));
        } else {
          this.currentUserSubject.next(null);
          localStorage.removeItem('firebaseUser');
        }
      });
    });
  }

  // Register new user with email and password
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
      throw this.handleAuthError(error);
    }
  }

  // Log in existing user with email and password
  public async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      if (!userCredential.user) {
        throw new Error('Login failed: no user returned');
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
      throw this.handleAuthError(error);
    }
  }

  // Sign in with Google OAuth provider
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
      throw this.handleAuthError(error);
    }
  }

  // Log out current user
  public async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUserSubject.next(null);
      localStorage.removeItem('firebaseUser');
      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Send password reset email
  public async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Get current user synchronously
  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is logged in
  public get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  // Get Firebase user object
  public async getFirebaseUser(): Promise<FirebaseUser | null> {
    return this.auth.currentUser;
  }

  // Handle authentication errors with user-friendly messages
  private handleAuthError(error: any): Error {
    let message = 'An authentication error occurred';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address';
        break;
      case 'auth/operation-not-allowed':
        message = 'Operation not allowed';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password';
        break;
      case 'auth/invalid-credential':
        message = 'Invalid credentials provided';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in cancelled';
        break;
      case 'auth/popup-blocked':
        message = 'Pop-up blocked by browser';
        break;
      default:
        message = error.message || message;
    }
    return new Error(message);
  }
}