import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
//import { Auth } from '@angular/fire/auth';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from '@angular/fire/auth';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { UserService, UserProfile } from './user.service';
import { MessagingService } from './messaging.service';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  // Additional profile fields
  phoneNumber?: string | null;
  type?: string | null;
  reviews?: string | null;
  restaurant?: string | null;
  restaurantId?: string | null;
  bio?: string | null;
  preferences?: {
    language?: 'EN' | 'TC';
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
  // Metadata
  createdAt?: any;
  modifiedAt?: any;
  lastLoginAt?: any;
  loginCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private authInitializedSubject = new BehaviorSubject<boolean>(false);
  public authInitialized$: Observable<boolean> = this.authInitializedSubject.asObservable();
  private auth = inject(Auth);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private platform = inject(Platform);
  private userService = inject(UserService);
  private messagingService = inject(MessagingService);
  // Flag to track if we're on a mobile platform
  private readonly isMobile: boolean;
  // Flag to prevent duplicate profile creation attempts
  private isCreatingProfile = false;

  constructor() {
    // Determine if we're on a native mobile platform
    this.isMobile = this.platform.is('capacitor') || 
      this.platform.is('cordova') || 
      this.platform.is('android') || 
      this.platform.is('ios');
    
    console.log('AuthService: Initialised, isMobile:', this.isMobile);
    
    this.initialiseAuth();
  }

  /**
   * Initialise authentication state listener.
   * This listener fires whenever the user's authentication state changes
   * (login, logout, token refresh, etc.)
   */
  private initialiseAuth(): void {
    console.log('AuthService: Setting up auth state listener');
    
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      await this.ngZone.run(async () => {
        if (firebaseUser) {
          console.log('AuthService: User authenticated:', firebaseUser.uid);
          console.log('AuthService: Email:', firebaseUser.email);
          console.log('AuthService: Display name:', firebaseUser.displayName);
          
          try {
            // Get fresh ID token for API authentication
            const idToken = await firebaseUser.getIdToken(true);
            console.log('AuthService: ID token obtained, length:', idToken.length);
            
            // Set token in user service immediately
            this.userService.setAuthToken(idToken);

            const user: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified
            };
            
            this.currentUserSubject.next(user);
            if (!this.authInitializedSubject.value) {
              this.authInitializedSubject.next(true);
            }

            // Ensure user profile exists in Firestore
            // This is done after we have a valid token
            await this.ensureUserProfileExists(user);
            
            // Update login metadata (don't block on this)
            this.updateLoginMetadata(user.uid).catch(error => {
              console.warn('AuthService: Failed to update login metadata', error);
            });
            
          } catch (error) {
            console.error('AuthService: Error in auth state change handler:', error);
          }
        } else {
          console.log('AuthService: User logged out or not authenticated');
          this.currentUserSubject.next(null);
          if (!this.authInitializedSubject.value) {
            this.authInitializedSubject.next(true);
          }
          this.userService.clearAuthToken();
          localStorage.removeItem('firebaseUser');
        }
      });
    });
  }

  /**
   * Ensure user profile exists in Firestore, create if missing.
   * This method includes retry logic and proper error handling to deal with
   * race conditions and token propagation delays.
   */
  private async ensureUserProfileExists(user: User): Promise<void> {
    // Prevent duplicate profile creation attempts
    if (this.isCreatingProfile) {
      console.log('AuthService: Profile creation already in progress, skipping');
      return;
    }

    try {
      console.log('AuthService: Ensuring profile exists for user:', user.uid);
      
      // Small delay to ensure token has fully propagated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if profile exists
      const exists = await firstValueFrom(this.userService.profileExists(user.uid));
      
      if (!exists) {
        console.log('AuthService: Profile does not exist, creating new profile');
        this.isCreatingProfile = true;
        
        // Create new profile with OAuth data
        const newProfile: Partial<UserProfile> = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          loginCount: 0,
          preferences: {
            language: 'EN',
            theme: 'light',
            notifications: true
          }
        };
        
        console.log('AuthService: Attempting to create profile with data:', newProfile);
        
        try {
          const result = await firstValueFrom(this.userService.createUserProfile(newProfile));
          console.log('AuthService: User profile created successfully with ID:', result.id);
        } catch (createError: any) {
          console.error('AuthService: Failed to create user profile:', createError);
          
          // If profile already exists (409), that's okay - might be a race condition
          if (createError.message?.includes('already exists')) {
            console.log('AuthService: Profile already exists (race condition), continuing');
          } else {
            // For other errors, log but don't block authentication
            console.error('AuthService: Profile creation failed, but user is still authenticated');
          }
        } finally {
          this.isCreatingProfile = false;
        }
      } else {
        console.log('AuthService: Profile already exists, loading from Firestore');
        // Load existing profile into cache
        await firstValueFrom(this.userService.getUserProfile(user.uid));
      }
    } catch (error) {
      console.error('AuthService: Error in ensureUserProfileExists:', error);
      this.isCreatingProfile = false;
      // Don't block login if profile operations fail
    }
  }

  /**
   * Update login metadata (last login time and count).
   * This is called after successful authentication.
   */
  private async updateLoginMetadata(uid: string): Promise<void> {
    try {
      console.log('AuthService: Updating login metadata for:', uid);
      await firstValueFrom(this.userService.updateLoginMetadata(uid));
      console.log('AuthService: Login metadata updated successfully');
    } catch (error) {
      console.error('AuthService: Error updating login metadata:', error);
      // Don't block login if metadata update fails
    }
  }

  /**
   * Register new user with email and password.
   * Creates Firebase Auth account and sends verification email.
   */
  public async registerWithEmail(email: string, password: string, name?: string): Promise<User> {
    try {
      console.log('AuthService: Registering new user with email:', email);
      
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      if (!userCredential.user) {
        throw new Error('Registration failed: no user returned');
      }
      
      console.log('AuthService: User registered with uid:', userCredential.user.uid);
      
      if (name) {
        console.log('AuthService: Updating display name to:', name);
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      console.log('AuthService: Sending email verification');
      await sendEmailVerification(userCredential.user);
      
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('AuthService: Registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Log in existing user with email and password.
   * Verifies credentials with Firebase Authentication.
   */
  public async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      console.log('AuthService: Logging in user with email:', email);
      
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      if (!userCredential.user) {
        throw new Error('Login failed: no user returned');
      }
      
      console.log('AuthService: User logged in with uid:', userCredential.user.uid);
      
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('AuthService: Login error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Google OAuth provider.
   * On native (Capacitor) platforms, uses the native Google Sign-In SDK via
   * @capgo/capacitor-social-login — shows the system account picker sheet,
   * no browser involved, so Google's disallowed_useragent block is avoided.
   * On web, uses Firebase popup flow.
   */
  public async signInWithGoogle(): Promise<User | null> {
    try {
      if (this.isNativePlatform()) {
        console.log('AuthService: Using native Google Sign-In (SocialLogin)');
        const result = await SocialLogin.login({ provider: 'google', options: {} });
        const idToken = (result.result as { idToken?: string })?.idToken;
        if (!idToken) {
          throw new Error('Google sign-in failed: no ID token returned');
        }
        console.log('AuthService: Native Google Sign-In succeeded, exchanging for Firebase credential');
        return await this.signInWithGoogleCredential(idToken);
      }

      // Web: use Firebase popup flow
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      console.log('AuthService: Using popup flow for Google sign-in (web)');
      const userCredential = await signInWithPopup(this.auth, provider);
      if (!userCredential?.user) {
        throw new Error('Google sign-in failed: no user returned');
      }
      console.log('AuthService: Google sign-in successful, uid:', userCredential.user.uid);
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('AuthService: Error during Google sign-in:', error);
      throw this.handleAuthError(error);
    }
  }

  /** Check if running inside a Capacitor native shell */
  private isNativePlatform(): boolean {
    try {
      return Capacitor?.isNativePlatform?.() === true;
    } catch {
      return false;
    }
  }

  /**
   * Sign in using a Google ID token obtained from the One Tap prompt.
   * Used when the user completes the GSI One Tap credential flow.
   */
  public async signInWithGoogleCredential(idToken: string): Promise<User> {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(this.auth, credential);
      if (!userCredential?.user) {
        throw new Error('Google sign-in failed: no user returned');
      }
      console.log('AuthService: Google credential sign-in successful, uid:', userCredential.user.uid);
      return {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        emailVerified: userCredential.user.emailVerified
      };
    } catch (error: any) {
      console.error('AuthService: Error during Google credential sign-in:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Log out current user.
   * Clears authentication state and navigates to login page.
   */
  public async logout(): Promise<void> {
    try {
      console.log('AuthService: Logging out user');
      const idToken = await this.getIdToken();

      if (idToken) {
        await this.messagingService.deleteCurrentToken(idToken);
      }

      await signOut(this.auth);
      this.currentUserSubject.next(null);
      this.userService.clearAuthToken();
      this.userService.clearCache();
      localStorage.removeItem('firebaseUser');
      console.log('AuthService: Logout successful');
      await this.router.navigate(['/login']);
    } catch (error: any) {
      console.error('AuthService: Logout error:', error);
      throw this.handleAuthError(error);
    }
  }

  // Send password reset email
  public async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      console.log('AuthService: Sending password reset email to:', email);
      await sendPasswordResetEmail(this.auth, email);
      console.log('AuthService: Password reset email sent');
    } catch (error: any) {
      console.error('AuthService: Password reset error:', error);
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

  /**
   * Get current ID token for API calls.
   * Forces token refresh to ensure it's valid.
   */
  public async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) {
      console.warn('AuthService: Cannot get ID token, no user logged in');
      return null;
    }
    try {
      const token = await user.getIdToken(true);
      console.log('AuthService: Fresh ID token obtained');
      return token;
    } catch (error) {
      console.error('AuthService: Error getting ID token', error);
      return null;
    }
  }

  /**
   * Handle authentication errors with user-friendly messages.
   * Translates Firebase error codes into readable messages.
   */
  private handleAuthError(error: any): Error {
    let message = 'An authentication error occurred';
    
    console.error('AuthService: Handling auth error:', error.code, error.message);
    
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
      case 'auth/redirect-cancelled-by-user':
        message = 'Sign-in cancelled';
        break;
      case 'auth/redirect-operation-pending':
        message = 'Another sign-in operation is pending';
        break;
      case 'ERR_CANCELED':
        message = 'Sign-in cancelled';
        break;
      default:
        message = error.message || message;
    }
    return new Error(message);
  }
}
