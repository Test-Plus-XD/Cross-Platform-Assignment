import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
//import { Auth,User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Holds current user, null if not signed in
  private currentUserSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  public currentUser$: Observable<any> = this.currentUserSubject.asObservable();

  constructor(private afAuth: AngularFireAuth) {
    // Subscribe to auth state changes
    this.afAuth.authState.subscribe((user: any) => {
      this.currentUserSubject.next(user);
      // Optionally store user in local storage for persistence across sessions
      if (user) {
        localStorage.setItem('firebaseUser', JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName }));
      } else {
        localStorage.removeItem('firebaseUser');
      }
    });
  }

  // Register with email & password
  public async registerWithEmail(email: string, password: string, name?: string): Promise<any> {
    const userCredential = await this.afAuth.createUserWithEmailAndPassword(email, password);
    if (!userCredential.user) {
      throw new Error('Registration failed: no user returned');
    }
    // Update user profile with name if provided
    if (name) {
      await userCredential.user.updateProfile({ displayName: name });
    }
    // You may wish to send verification email etc here
    await userCredential.user.sendEmailVerification();
    return userCredential.user;
  }

  // Login with email & password
  public async loginWithEmail(email: string, password: string): Promise<any> {
    const userCredential = await this.afAuth.signInWithEmailAndPassword(email, password);
    if (!userCredential.user) {
      throw new Error('Login failed: no user returned');
    }
    if (!userCredential.user.emailVerified) {
      // Example policy: require email verification
      throw new Error('Email not verified');
    }
    return userCredential.user;
  }

  // Login with Google (unified Google sign-in will register new users automatically via Firebase)
  public async signInWithGoogle(): Promise<any> {
    try {
      // Import GoogleAuthProvider at runtime to avoid module resolution issues
      const firebaseAuth = await import('firebase/auth');
      const provider = new firebaseAuth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await this.afAuth.signInWithPopup(provider);
      if (!userCredential?.user) {
        throw new Error('Google sign-in failed: no user returned');
      }
      return userCredential.user;
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      throw error;
    }
  }

  // Logout
  public async logout(): Promise<void> {
    await this.afAuth.signOut();
    this.currentUserSubject.next(null);
    localStorage.removeItem('firebaseUser');
  }

  // Helper: get current user synchronously
  public get currentUser(): any {
    return this.currentUserSubject.value;
  }

  // Helper: is user logged in
  public get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }
}