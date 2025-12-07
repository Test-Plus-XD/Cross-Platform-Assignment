import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
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
  loadError: string | null = null;

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
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(async User => {
      // Loading state is reset when authentication state changes
      this.isLoading = true;
      this.loadError = null;

      if (!User) {
        this.isLoading = false;
        this.userProfile = null;
        this.chatRooms = [];
        console.log('ChatPage: No authenticated user');
        return;
      }

      console.log('ChatPage: Authenticated user detected:', User.uid);

      // User profile is retrieved from Firestore
      this.userService.getUserProfile(User.uid).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (Profile: UserProfile | null) => {
          this.userProfile = Profile;

          if (!Profile) {
            console.warn('ChatPage: User profile not found');
            this.loadError = 'User profile not found';
            this.isLoading = false;
            return;
          }

          console.log('ChatPage: User profile loaded:', Profile.type);

          // Chat rooms are loaded for this user
          await this.loadChatRooms(Profile.uid);

          this.isLoading = false;
        },
        error: (error) => {
          console.error('ChatPage: error loading user profile', error);
          this.loadError = 'Failed to load user profile';
          this.isLoading = false;
          this.userProfile = null;
        }
      });
    });
  }

  /// Loads chat rooms from the API with comprehensive error handling
  private async loadChatRooms(UserId: string): Promise<void> {
    try {
      console.log('ChatPage: Loading chat rooms for user', UserId);

      const Token = await this.authService.getIdToken();
      if (!Token) {
        console.warn('ChatPage: No authentication token available');
        this.loadError = 'Authentication token not available';
        return;
      }

      const Headers = new HttpHeaders({
        'Authorization': `Bearer ${Token}`,
        'x-api-passcode': 'PourRice',
        'Content-Type': 'application/json'
      });

      console.log('ChatPage: Fetching chat records from API');

      // Chat records are fetched from the API endpoint
      const Response = await this.httpClient.get<{
        userId: string;
        totalRooms: number;
        rooms: ChatRoom[];
      }>(
        `${environment.apiUrl}/API/Chat/Records/${UserId}`,
        { headers: Headers }
      ).toPromise();

      if (!Response) {
        console.error('ChatPage: No response from API');
        this.loadError = 'No response from server';
        this.chatRooms = [];
        return;
      }

      console.log('ChatPage: API response received:', Response);

      // Chat rooms array is updated with the fetched data
      this.chatRooms = Response.rooms || [];

      console.log('ChatPage: Successfully loaded', this.chatRooms.length, 'chat rooms');

      // Each room's data is logged for debugging purposes
      this.chatRooms.forEach((Room, Index) => {
        console.log(`ChatPage: Room ${Index + 1}:`, {
          roomId: Room.roomId,
          participants: Room.participants?.length || 0,
          messageCount: Room.messageCount || 0,
          lastMessage: Room.lastMessage || 'No messages',
          lastMessageAt: Room.lastMessageAt || 'Never'
        });
      });

    } catch (error) {
      console.error('ChatPage: error loading chat rooms', error);

      // HTTP error responses are handled with detailed logging
      if (error instanceof HttpErrorResponse) {
        console.error('ChatPage: HTTP error Status:', error.status);
        console.error('ChatPage: HTTP error Message:', error.message);
        console.error('ChatPage: HTTP error Body:', error.error);

        if (error.status === 401) {
          this.loadError = 'Authentication failed. Please log in again.';
        } else if (error.status === 403) {
          this.loadError = 'Access denied. You do not have permission to view chat records.';
        } else if (error.status === 404) {
          this.loadError = 'Chat records endpoint not found.';
        } else if (error.status === 500) {
          this.loadError = 'Server error. Please try again later.';
        } else {
          this.loadError = `Failed to load chat rooms: ${error.message}`;
        }
      } else if (error instanceof Error) {
        this.loadError = `error: ${error.message}`;
      } else {
        this.loadError = 'Unknown error occurred while loading chat rooms';
      }
      this.chatRooms = [];
    }
  }

  /// Opens a specific chat room
  openChatRoom(Room: ChatRoom): void {
    this.selectedRoom = Room;

    console.log('ChatPage: Opening chat room', Room.roomId);

    // Socket.IO room is joined for real-time updates
    this.chatService.joinRoom(Room.roomId);

    // Navigation is handled based on room type
    if (Room.roomId.startsWith('restaurant-')) {
      // Restaurant chat rooms navigate to restaurant page
      const RestaurantId = Room.roomId.replace('restaurant-', '');
      console.log('ChatPage: Navigating to restaurant page:', RestaurantId);
      this.router.navigate(['/restaurants', RestaurantId]);
    } else {
      // Other room types could be handled here in future
      console.log('ChatPage: Room type not yet supported for navigation');
    }
  }

  /// Gets the other participant in a direct chat (excluding current user)
  getOtherParticipant(Room: ChatRoom): any {
    if (!Room.participantsData || Room.participantsData.length === 0) {
      return { displayName: 'Unknown', photoURL: null };
    }

    // First participant is returned (current user should be excluded by API)
    return Room.participantsData[0];
  }

  /// Gets room display name based on room type and data
  getRoomDisplayName(Room: ChatRoom): string {
    // Room name is used if explicitly set
    if (Room.name) {
      return Room.name;
    }

    // Restaurant rooms use a default label
    if (Room.roomId.startsWith('restaurant-')) {
      return 'Restaurant Chat';
    }

    // Direct chats use the other participant's name
    const OtherParticipant = this.getOtherParticipant(Room);
    return OtherParticipant.displayName || 'Chat';
  }

  /// Gets room avatar/icon based on participants
  getRoomAvatar(Room: ChatRoom): string | null {
    // Direct chats use the other participant's photo
    const OtherParticipant = this.getOtherParticipant(Room);
    return OtherParticipant.photoURL || null;
  }

  /// Formats timestamp to human-readable format with language support
  formatTimestamp(Timestamp: string | undefined): string {
    if (!Timestamp) return '';

    const date = new Date(Timestamp);
    const Now = new Date();
    const DiffInMs = Now.getTime() - date.getTime();
    const DiffInMinutes = Math.floor(DiffInMs / 60000);
    const DiffInHours = Math.floor(DiffInMinutes / 60);
    const DiffInDays = Math.floor(DiffInHours / 24);

    const Lang = this.languageService.getCurrentLanguage();

    // Time differences are formatted based on recency
    if (DiffInMinutes < 1) {
      return Lang === 'TC' ? '剛才' : 'Just now';
    } else if (DiffInMinutes < 60) {
      return Lang === 'TC' ? `${DiffInMinutes}分鐘前` : `${DiffInMinutes}m ago`;
    } else if (DiffInHours < 24) {
      return Lang === 'TC' ? `${DiffInHours}小時前` : `${DiffInHours}h ago`;
    } else if (DiffInDays < 7) {
      return Lang === 'TC' ? `${DiffInDays}天前` : `${DiffInDays}d ago`;
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

  /// Retry loading chat rooms after an error
  retryLoad(): void {
    if (this.userProfile?.uid) {
      this.isLoading = true;
      this.loadError = null;
      this.loadChatRooms(this.userProfile.uid);
    }
  }
}