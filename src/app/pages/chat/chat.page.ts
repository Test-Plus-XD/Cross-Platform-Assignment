import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { LanguageService } from '../../services/language.service';
import { ChatService, ChatRoom } from '../../services/chat.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit, OnDestroy {
  // Language stream
  lang$ = this.languageService.lang$;

  // User profile
  userProfile: UserProfile | null = null;
  isLoading = true;

  // Chat rooms
  chatRooms: ChatRoom[] = [];
  selectedRoom: ChatRoom | null = null;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly languageService: LanguageService,
    private readonly chatService: ChatService,
    private readonly httpClient: HttpClient,
    private readonly router: Router
  ) { }

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /// Loads current user profile and chat rooms
  private loadUserProfile(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(async user => {
      if (!user) {
        this.isLoading = false;
        this.userProfile = null;
        this.chatRooms = [];
        return;
      }

      // Get user profile
      this.userService.getUserProfile(user.uid).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (profile: UserProfile | null) => {
          this.userProfile = profile;
          console.log('ChatPage: User profile loaded:', profile?.type);

          // Load chat rooms for this user
          if (profile) {
            await this.loadChatRooms(profile.uid);
          }

          this.isLoading = false;
        },
        error: (err) => {
          console.error('ChatPage: Error loading user profile', err);
          this.isLoading = false;
          this.userProfile = null;
        }
      });
    });
  }

  /// Loads chat rooms from the API
  private async loadChatRooms(uid: string): Promise<void> {
    try {
      const token = await this.authService.getIdToken();
      if (!token) {
        console.warn('ChatPage: No auth token available');
        return;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'x-api-passcode': 'PourRice'
      });

      // Fetch chat records from API
      const response = await this.httpClient.get<{
        userId: string;
        totalRooms: number;
        rooms: ChatRoom[];
      }>(
        `${environment.apiUrl}/API/Chat/Records/${uid}`,
        { headers }
      ).toPromise();

      if (response && response.rooms) {
        this.chatRooms = response.rooms;
        console.log('ChatPage: Loaded', this.chatRooms.length, 'chat rooms');
      }
    } catch (error) {
      console.error('ChatPage: Error loading chat rooms', error);
    }
  }

  /// Opens a specific chat room
  openChatRoom(room: ChatRoom): void {
    this.selectedRoom = room;

    // Join the room via Socket.IO
    this.chatService.joinRoom(room.roomId);

    // Navigate to restaurant page if it's a restaurant chat
    if (room.roomId.startsWith('restaurant-')) {
      const restaurantId = room.roomId.replace('restaurant-', '');
      this.router.navigate(['/restaurants', restaurantId]);
    }
  }

  /// Gets the other participant in a direct chat (excluding current user)
  getOtherParticipant(room: ChatRoom): any {
    if (!room.participantsData || room.participantsData.length === 0) {
      return { displayName: 'Unknown', photoURL: null };
    }
    return room.participantsData[0];
  }

  /// Gets room display name
  getRoomDisplayName(room: ChatRoom): string {
    if (room.name) {
      return room.name;
    }

    // For restaurant rooms
    if (room.roomId.startsWith('restaurant-')) {
      return 'Restaurant Chat';
    }

    // For direct chats, use other participant's name
    const otherParticipant = this.getOtherParticipant(room);
    return otherParticipant.displayName || 'Chat';
  }

  /// Gets room avatar/icon
  getRoomAvatar(room: ChatRoom): string | null {
    // For direct chats, use other participant's photo
    const otherParticipant = this.getOtherParticipant(room);
    return otherParticipant.photoURL;
  }

  /// Formats timestamp to human-readable format
  formatTimestamp(timestamp: string | undefined): string {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    const lang = this.languageService.getCurrentLanguage();

    if (diffInMinutes < 1) {
      return lang === 'TC' ? '剛才' : 'Just now';
    } else if (diffInMinutes < 60) {
      return lang === 'TC' ? `${diffInMinutes}分鐘前` : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return lang === 'TC' ? `${diffInHours}小時前` : `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return lang === 'TC' ? `${diffInDays}天前` : `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /// Check if user is a diner (customer)
  isDiner(): boolean {
    return this.userProfile?.type?.toLowerCase() === 'diner';
  }

  /// Check if user is a restaurant owner
  isRestaurant(): boolean {
    return this.userProfile?.type?.toLowerCase() === 'restaurant';
  }
}