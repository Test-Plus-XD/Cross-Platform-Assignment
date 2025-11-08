import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, updateProfile } from '@angular/fire/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';  // only if using compat mode
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private auth: Auth, private userService: UserService) { }

  // Register with email & password
  async registerWithEmail(email: string, password: string, displayName: string): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;
    if (user) {
      await updateProfile(user, { displayName });
      // Optionally call your backend to create a user record
      await this.userService.createUserRecord({ uid: user.uid, email: user.email, displayName: user.displayName });
    }
  }

  // Login with email & password
  async loginWithEmail(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;
    if (user) {
      // Optionally get token and call backend
      const token = await user.getIdToken();
      await this.userService.setAuthToken(token);
    }
  }

  // Login with Google
  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(this.auth, provider);
    const user = userCredential.user;
    if (user) {
      // Update backend user record
      const token = await user.getIdToken();
      await this.userService.setAuthToken(token);
      await this.userService.createUserRecord({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL });
    }
  }

  // Logout
  async logout(): Promise<void> {
    await signOut(this.auth);
    this.userService.clearAuthToken();
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }
}