# CLAUDE.md - AI Assistant Guide for Cross-Platform-Assignment

> **Last Updated:** 2026-03-21 | **Version:** 1.15.2 | **Angular:** 20.3.3 | **Ionic:** 8.7.9
> **REST API:** `..\Vercel-Express-API` (Vercel) | **Socket.IO:** `..\Railway-Socket` (Railway)

## Table of Contents
1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture Patterns](#architecture-patterns)
5. [API Documentation](#api-documentation)
6. [Data Models](#data-models)
7. [Development Workflow](#development-workflow)
8. [Key Services](#key-services)
9. [Shared Components](#shared-components)
10. [Security](#security)
11. [Styling](#styling)
12. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Project Overview

Full-stack restaurant discovery and booking application with Angular/Ionic frontend and Node.js/Express backend.

**Dual-Backend Architecture:**
- **REST API:** https://vercel-express-api-alpha.vercel.app
- **Socket.IO:** https://railway-socket-production.up.railway.app

**Core Features:**
- Multi-platform deployment (Web PWA, iOS, Android via Capacitor)
- Bilingual support (EN/TC) with language switching
- Restaurant search powered by Algolia with district/keyword filtering
- User authentication (Firebase Auth + Google OAuth)
- Booking management (create, view, manage reservations)
- Interactive maps (Google Maps integration)
- Real-time chat (Socket.IO for restaurant-customer communication)
- AI assistant (Google Gemini integration)
- Push notifications (Firebase Cloud Messaging)
- Advertisement placement via Stripe payment (v1.11.0)
- Dark/light theming with system preference detection
- Adaptive responsive layouts (mobile/web optimised)

---

## Codebase Structure

```
src/app/
├── pages/                     # Lazy-loaded feature modules
│   ├── home/                  # Featured content + latest reviews
│   ├── search/                # Algolia search with filters
│   ├── restaurant/            # Detail view + map + chat
│   ├── user/                  # User profile (auth-protected)
│   ├── bookings/              # Reservation management
│   ├── store/                 # Restaurant admin panel
│   │   ├── store.page.ts/html/scss           # Main store page (Info/Menu/Bookings/Ads tabs)
│   │   ├── restaurant-info-modal/            # Edit info sub-page (/store/edit-info)
│   │   ├── ad-modal/                         # Ad creation modal (post-Stripe payment)
│   │   ├── menu-item-modal/                  # Add/edit menu item modal
│   │   └── bulk-menu-import-modal/           # DocuPipe bulk import modal
│   ├── login/                 # Authentication
│   ├── chat/                  # Chat overview page
│   └── test/                  # Development/testing
├── services/                  # 24 core services
│   ├── auth.service.ts                # Firebase authentication
│   ├── app-state.service.ts           # Centralized state (v1.7.0)
│   ├── restaurants.service.ts         # Restaurant CRUD
│   ├── user.service.ts                # User profile management
│   ├── booking.service.ts             # Booking CRUD
│   ├── reviews.service.ts             # Review CRUD + stats
│   ├── advertisements.service.ts       # Advertisement CRUD (v1.11.0)
│   ├── location.service.ts            # GPS + distance calculations
│   ├── chat.service.ts                # Socket.IO real-time chat
│   ├── gemini.service.ts              # AI assistant
│   ├── messaging.service.ts           # Firebase Cloud Messaging (v1.10.0)
│   ├── guard.service.ts               # Route protection
│   ├── theme.service.ts               # Dark/light mode
│   ├── language.service.ts            # EN/TC switching
│   ├── platform.service.ts            # Device detection
│   ├── data.service.ts                # HTTP client wrapper
│   ├── layout.service.ts              # UI layout state
│   ├── swiper.service.ts              # Carousel management
│   ├── UI.service.ts                  # UI utilities
│   ├── mock-data.service.ts           # Demo data
│   ├── chat-visibility.service.ts     # Button visibility (v1.8.0)
│   ├── store-helpers.service.ts       # Utility helpers (v1.8.0)
│   ├── store-feature.service.ts       # Service aggregator (v1.7.0)
│   └── restaurant-feature.service.ts  # Service aggregator (v1.7.0)
├── constants/                 # Modular constants (v1.7.0)
│   ├── districts.const.ts     # 18 HK districts
│   ├── keywords.const.ts      # 140+ restaurant keywords
│   ├── payments.const.ts      # 10 payment methods
│   ├── weekdays.const.ts      # Weekday definitions
│   ├── constants-helpers.ts   # Helper functions
│   └── index.ts               # Barrel export
├── shared/                    # Reusable components
│   ├── header/                # App header
│   ├── footer/                # App footer
│   ├── menu/                  # Side navigation menu
│   ├── tab/                   # Bottom tab bar
│   ├── chat-button/           # Restaurant chat (login required)
│   └── gemini-button/         # AI assistant (global, no login)
└── environments/              # Environment configs
    ├── environment.ts         # Development
    └── environment.prod.ts    # Production
```

**Backend Repositories (Sibling Directories):**
- **REST API:** `..\Vercel-Express-API` (deployed to Vercel)
- **Socket.IO:** `..\Railway-Socket` (deployed to Railway)

**IMPORTANT FOR AI AGENTS:**
When working with API endpoints, **always read `..\Vercel-Express-API\API.md`** to verify:
- Correct endpoint paths and HTTP methods
- Required request body fields and their types
- Authentication requirements (protected vs public)
- Response data structures
- Current API implementation details

If you need to add/modify endpoints or API functionality, update both:
1. The API code in `..\Vercel-Express-API`
2. The API.md documentation in `..\Vercel-Express-API\API.md`
3. This CLAUDE.md file (if major changes)

---

## Technology Stack

### Frontend
**Framework:** Angular 20.3.3, Ionic 8.7.9
**Language:** TypeScript 5.9.3
**State Management:** RxJS 7.8.2 (BehaviorSubjects)
**Styling:** Tailwind CSS 4.1.14, SCSS
**Search:** Algolia 5.42.0
**Maps:** Google Maps JavaScript API v3
**Carousels:** Swiper 12.0.2
**Native Bridge:** Capacitor 7.4.3
**Auth:** Firebase Auth 12.5.0
**Database:** Firestore 12.5.0
**Real-time:** Socket.IO Client 4.8.1
**AI:** Google Gemini API

### Backend
**Deployment:** Vercel (REST API), Railway (Socket.IO)
**Runtime:** Node.js
**Framework:** Express 5.1.0
**Auth:** Firebase Admin 13.5.0 (JWT verification)
**Middleware:** CORS 2.8.5
**Module System:** ES Modules
**Real-time Server:** Socket.IO Server

### DevOps
**Testing:** Jasmine 5.11.0, Karma 6.4.4
**Linting:** ESLint 9.36.0
**Build Tool:** Angular CLI 20.3.4
**PWA:** Angular Service Worker 20.3.3
**Error Tracking:** Sentry (PHP)

---

## Architecture Patterns

### 1. State Management
- **No Redux/NgRx:** Uses RxJS BehaviorSubjects
- **Observable Pattern:** Services expose `Observable<T>` streams
- **Async Pipe:** Templates subscribe via `| async`
- **AppStateService (v1.7.0):** Centralized auth state, fixes circular dependency

```typescript
// Service pattern
private data = new BehaviorSubject<T>(initialValue);
public data$ = this.data.asObservable();

// Component template
{{ data$ | async }}
```

**AppState Interface:**
```typescript
export interface AppState {
  sessionId: string;        // Unique session identifier
  isLoggedIn: boolean;      // Authentication status
  uid: string | null;       // Firebase user ID
  displayName: string | null;
  email: string | null;
}
```

### 2. Naming Conventions
- **Components:** `*.page.ts` or `*.component.ts`
- **Services:** `*.service.ts`
- **Selectors:** `app-*` (kebab-case)
- **Classes:** PascalCase
- **Variables:** camelCase

### 3. Data Flow
```
Component ← Observable ← BehaviorSubject ← Service ← HTTP ← API ← Firestore
```

### 4. Error Handling
- Try-catch blocks for all async operations
- RxJS `catchError` for HTTP errors
- User-friendly error messages (Firebase errors translated)
- Console logging for debugging

### 5. Performance Optimizations (v1.7.0)

**Split Constants File:**
- Broke down 215-line monolithic file into modular files
- Reduced parsing overhead by 60-70%
- Files: `districts.const.ts`, `keywords.const.ts`, `payments.const.ts`, `weekdays.const.ts`, `constants-helpers.ts`

**Fixed Circular Dependency:**
- Created `AppStateService` to eliminate circular dependency between `AppComponent` and shared components
- Reduced compilation time by ~15%
- AppComponent simplified from 156 lines to 71 lines

**OnPush Change Detection:**
- Enabled `ChangeDetectionStrategy.OnPush` on large components (store.page.ts, restaurant.page.ts)
- Reduced change detection overhead by 60-80%
- Improved scroll and form performance

**Service Aggregators:**
- `StoreFeatureService` and `RestaurantFeatureService` consolidate commonly used services
- Reduces constructor injection overhead

**Results:**
- Full rebuild: ~45-60s → ~30-40s (~35% faster)
- Incremental recompilation: ~8-12s → ~5-7s (~40% faster)
- UI interactions: ~50-60% faster

---

## API Documentation

### Base URLs
- **Production:** `https://vercel-express-api-alpha.vercel.app`
- **Local (optional):** `http://localhost:3000`

### Security Requirements

**All endpoints require:**
```
x-api-passcode: PourRice
```

**Protected endpoints also require:**
```
Authorization: Bearer <firebase-id-token>
```

### Complete API Routes

#### Authentication (`/API/Auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | ❌ | Create new user account (`email`, `password`, `displayName`) |
| POST | `/login` | ❌ | Email/password login |
| POST | `/google` | ❌ | Google OAuth authentication (`idToken`) |
| POST | `/verify` | ❌ | Verify Firebase ID token |
| POST | `/reset-password` | ❌ | Send password reset email |
| POST | `/logout` | ❌ | Revoke user refresh tokens |
| DELETE | `/delete-account` | ❌ | Delete user account permanently |

#### Restaurants (`/API/Restaurants`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all restaurants |
| GET | `/:id` | ❌ | Get single restaurant |
| POST | `/` | ❌ | Create new restaurant |
| PUT | `/:id` | ❌ | Update restaurant |
| DELETE | `/:id` | ❌ | Delete restaurant |
| POST | `/:id/image` | ✅ | Upload restaurant image |
| POST | `/:id/claim` | ✅ | Claim restaurant ownership (v1.6.0) |

**Restaurant Fields:**
```typescript
{
  Name_EN, Name_TC, Address_EN, Address_TC, District_EN, District_TC,
  Latitude, Longitude, Keyword_EN[], Keyword_TC[], ImageUrl, Seats,
  Owner (UID), Contacts{Phone,Email,Website}, Opening_Hours{day:hours}
}
```

#### Menu Sub-collection (`/API/Restaurants/:restaurantId/menu`)
**Important:** Menu items stored as sub-collection, not array field.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:restaurantId/menu` | ❌ | List all menu items |
| GET | `/:restaurantId/menu/:menuItemId` | ❌ | Get single menu item |
| POST | `/:restaurantId/menu` | ❌ | Create menu item |
| PUT | `/:restaurantId/menu/:menuItemId` | ❌ | Update menu item |
| DELETE | `/:restaurantId/menu/:menuItemId` | ❌ | Delete menu item |

**Menu Item Fields:**
```typescript
{ Name_EN, Name_TC, Description_EN, Description_TC, Price, ImageUrl }
```

#### Users (`/API/Users`)
| Method | Endpoint | Auth | Description | Ownership |
|--------|----------|------|-------------|-----------|
| GET | `/` | ❌ | List all users | Public |
| GET | `/:uid` | ❌ | Get user profile | Public |
| POST | `/` | ✅ | Create user profile | UID must match token |
| PUT | `/:uid` | ✅ | Update user profile | UID must match token |
| DELETE | `/:uid` | ✅ | Delete user profile | UID must match token |

**User Fields:**
```typescript
{
  uid (Firebase UID), email, displayName, photoURL, emailVerified,
  phoneNumber, type ('Diner'|'Restaurant'), restaurantId, bio,
  preferences{language,theme,notifications}, loginCount, lastLoginAt,
  createdAt, modifiedAt
}
```

#### Bookings (`/API/Bookings`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | List bookings (auto-filtered by userId) |
| GET | `/restaurant/:restaurantId` | ✅ | List all bookings for a restaurant (owner only); enriched with diner displayName/email/phoneNumber |
| GET | `/:id` | ✅ | Get single booking |
| POST | `/` | ✅ | Create booking (userId auto-set; status defaults to 'pending') |
| PUT | `/:id` | ✅ | Dual-ownership: diner (pending only: dateTime/numberOfGuests/specialRequests/cancel) or restaurant owner (status: accepted/declined/completed + declineMessage) |
| DELETE | `/:id` | ✅ | Delete booking record — only allowed if bookingDate is older than 30 days |

**Booking Fields (POST):**
```typescript
{
  restaurantId (required), restaurantName (required), dateTime (ISO 8601),
  numberOfGuests (required), specialRequests
  // userId auto-set, status defaults to 'pending'
}
```

**Booking Fields (PUT — Diner, pending only):**
```typescript
{ dateTime, numberOfGuests, specialRequests, status: 'cancelled' }
```

**Booking Fields (PUT — Restaurant owner, pending only):**
```typescript
{ status: 'accepted' | 'declined' | 'completed', declineMessage?: string | null }
```

#### Reviews (`/API/Reviews`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List reviews (`?restaurantId=X` or `?userId=X`) |
| GET | `/:id` | ❌ | Get single review |
| POST | `/` | ✅ | Create review (userId auto-set from token) |
| PUT | `/:id` | ✅ | Update review (own reviews only) |
| DELETE | `/:id` | ✅ | Delete review (own reviews only) |
| GET | `/Restaurant/:restaurantId/stats` | ❌ | Get review statistics |
| GET | `/batch-stats?restaurantIds=id1,id2` | ❌ | Batch review stats (max 50 IDs) |

**Review Fields (POST):**
```typescript
{
  restaurantId (required), rating (1-5, required),
  comment, imageUrl (v1.9.0 - optional review image)
  // userId auto-set, dateTime auto-set to current time
}
```

**Review Statistics Response:**
```typescript
{
  restaurantId, totalReviews, averageRating,
  ratingDistribution: {1,2,3,4,5}
}
```

#### Images (`/API/Images`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload` | ✅ | Upload image (multipart, 10MB max, JPEG/PNG/GIF/WebP) |
| DELETE | `/delete` | ✅ | Delete image from Firebase Storage |
| GET | `/metadata` | ❌ | Get image metadata |

**Upload Response:** `{ imageUrl: string }` (Signed URL)

#### Advertisements (`/API/Advertisements`) - v1.11.0
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all ads; optional `?restaurantId=X` query param |
| GET | `/:id` | ❌ | Get single ad |
| POST | `/` | ✅ | Create ad (userId auto-set from token; restaurantId required in body) |
| PUT | `/:id` | ✅ | Update ad (ownership: userId must match token) |
| DELETE | `/:id` | ✅ | Delete ad (ownership: userId must match token) |

**Advertisement Fields:**
```typescript
{
  id: string;
  Title_EN, Title_TC: string;      // Bilingual titles
  Content_EN, Content_TC: string;  // Bilingual content
  Image_EN, Image_TC: string;      // Bilingual image URLs
  restaurantId: string;
  userId: string;                  // Auto-set on creation
  status: 'active' | 'inactive';
  createdAt, modifiedAt: Timestamp;
}
```

**Ownership pattern:** `userId` is set on creation, verified on PUT/DELETE operations.

#### Stripe Payment (`/API/Stripe`) - v1.11.0
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/create-ad-checkout-session` | ✅ | Create Stripe checkout session for ads (HK$10) |

**Request Body:**
```json
{
  "restaurantId": "rest123",
  "successUrl": "https://app.example.com/store?payment_success=true&session_id={CHECKOUT_SESSION_ID}",
  "cancelUrl": "https://app.example.com/store"
}
```

**Response:** `{ sessionId: string, url: string }`

#### Search (`/API/Algolia`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/Restaurants` | ❌ | Search restaurants (`?query=X&district=Y&keywords=Z`) |
| GET | `/Restaurants/facets/:facetName` | ❌ | Get facet values |
| POST | `/Restaurants/advanced` | ❌ | Advanced search with custom filters |

**Facet Names:** `District_EN`, `District_TC`, `Keyword_EN`, `Keyword_TC`

#### AI (`/API/Gemini`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/generate` | ❌ | Generate text content (`prompt`) |
| POST | `/chat` | ❌ | Chat with AI (`message`, `history[]`) |
| POST | `/restaurant-description` | ❌ | Generate restaurant description |

#### Chat (`/API/Chat`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/Rooms` | ✅ | List all chat rooms (filtered by participant) |
| GET | `/Rooms/:roomId` | ✅ | Get single chat room |
| POST | `/Rooms` | ✅ | Create new chat room |
| GET | `/Rooms/:roomId/Messages` | ✅ | List messages (paginated, `?limit=50&before=X`) |
| POST | `/Rooms/:roomId/Messages` | ✅ | Save message to Firestore |
| PUT | `/Rooms/:roomId/Messages/:messageId` | ✅ | Edit message |
| DELETE | `/Rooms/:roomId/Messages/:messageId` | ✅ | Soft delete message |
| GET | `/Stats` | ✅ | Get chat statistics |

### HTTP Status Codes
- **200** OK, **201** Created, **204** No Content
- **400** Bad Request, **401** Unauthorized, **403** Forbidden
- **404** Not Found, **409** Conflict, **500** Server Error

**Error Format:** `{ "error": "message" }`

### Data Sanitization
Backend sanitizes `null`/`undefined` → `'—'` (em dash). Frontend services include `sanitizeImageUrl()` to handle this (v1.5.2 fix).

### Frontend Integration Patterns

**Using DataService (Recommended):**
```typescript
// In component
constructor(private dataService: DataService) {}

async loadRestaurants() {
  this.restaurants$ = this.dataService.get<{ count: number; data: Restaurant[] }>(
    '/API/Restaurants'
  );
}

async createBooking(bookingData: Partial<Booking>) {
  const token = await this.authService.getIdToken();
  const result = await this.dataService.post<{ id: string }>(
    '/API/Bookings',
    bookingData,
    token
  ).toPromise();

  console.log('Created booking:', result.id);
}
```

**Authentication Token Handling:**
```typescript
// DataService automatically attaches token if provided
async function protectedOperation() {
  const user = await this.authService.getCurrentUser().pipe(first()).toPromise();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await this.authService.getIdToken();
  return this.dataService.post('/API/Bookings', data, token);
}
```

**Testing API Endpoints:**

**Using cURL:**
```bash
# Public endpoint
curl -X GET https://vercel-express-api-alpha.vercel.app/API/Restaurants \
  -H "x-api-passcode: PourRice"

# Protected endpoint
curl -X POST https://vercel-express-api-alpha.vercel.app/API/Bookings \
  -H "x-api-passcode: PourRice" \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": "rest123",
    "restaurantName": "Dragon Palace",
    "dateTime": "2025-12-25T19:00:00Z",
    "numberOfGuests": 4
  }'
```

**Using Postman:**
1. Set base URL: `https://vercel-express-api-alpha.vercel.app`
2. Add header: `x-api-passcode: PourRice`
3. For protected routes, add header: `Authorization: Bearer <token>`
4. Set `Content-Type: application/json` for POST/PUT requests

---

## Data Models

### Restaurant
```typescript
{
  id: string;                    // Auto-generated
  Name_EN, Name_TC: string;      // Bilingual names
  Address_EN, Address_TC: string;
  District_EN, District_TC: string;
  Latitude, Longitude: number;
  Keyword_EN, Keyword_TC: string[];
  Opening_Hours: {[day: string]: string};  // e.g., "11:30-21:30"
  Seats: number;
  Contacts: {Phone, Email, Website};
  ImageUrl: string;
  ownerId: string;               // User UID
  createdAt, modifiedAt: Timestamp;
}
```

### User
```typescript
{
  uid: string;                   // Firebase Auth UID
  email, displayName, photoURL: string;
  type: 'Diner' | 'Restaurant';  // Case insensitive
  restaurantId: string;          // If type='Restaurant'
  preferences: {language, theme, notifications};
  loginCount: number;
  lastLoginAt, createdAt, modifiedAt: Timestamp;
}
```

### Booking
```typescript
{
  id: string;
  userId, restaurantId, restaurantName: string;
  dateTime: string (ISO 8601);
  numberOfGuests: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  declineMessage?: string | null;   // set by restaurant owner on decline
  specialRequests: string;
  createdAt, modifiedAt: Timestamp;
  // diner enrichment (GET /restaurant/:id response only):
  diner?: { displayName: string; email: string; phoneNumber: string };
}
```

### Review (v1.9.0)
```typescript
{
  id: string;
  restaurantId, userId: string;
  rating: number (1-5);
  comment: string;
  imageUrl: string;              // Optional review image
  createdAt, modifiedAt: Timestamp;
}
```

---

## Development Workflow

### Scripts
```bash
npm run dev              # Full stack (API port 3000 + frontend port 4200)
npm start                # Frontend only (port 4200)
npm run start:api        # Backend only (port 3000)
npm run build            # Production build → www/
npm test                 # Jasmine + Karma tests
npm run lint             # ESLint
npm run build:tailwind   # Compile Tailwind CSS
npx cap sync             # Sync web assets to native projects
```

### Environment Configuration
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'https://vercel-express-api-alpha.vercel.app',
  socketUrl: 'https://railway-socket-production.up.railway.app', // v1.6.1
  algoliaAppId: 'V9HMGL1VIZ',
  algoliaSearchKey: '563754aa2e02b4838af055fbf37f09b5',
  googleMapsApiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
  firebaseConfig: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef'
  }
};
```

**Important:** `apiUrl` points to Vercel REST API, `socketUrl` points to Railway Socket.IO server, `googleMapsApiKey` enables Google Maps JavaScript API integration.

---

## Key Services

### 1. AuthService (`auth.service.ts`)
**Purpose:** Firebase authentication management

**Key Methods:**
- `login(email, password)` - Email/password login
- `loginWithGoogle()` - Google OAuth
- `logout()` - Sign out
- `getCurrentUser()` - Observable of current user
- `getIdToken()` - Get JWT token for API calls

**State:** `currentUser$: Observable<User | null>`

### 2. AppStateService (`app-state.service.ts`) - v1.7.0
**Purpose:** Centralized application state (fixes circular dependency)

**State:**
```typescript
appState$: Observable<AppState>
get appState: AppState  // Synchronous access
```

**Features:**
- Session management (sessionId in sessionStorage)
- Auth state tracking (isLoggedIn, uid, displayName, email)
- Persistent storage (localStorage)
- Auto-sync with AuthService

**Usage:**
```typescript
constructor(private appStateService: AppStateService) {}

ngOnInit() {
  this.appStateService.appState$.subscribe(state => {
    console.log('Logged in:', state.isLoggedIn);
  });
}
```

### 3. RestaurantsService (`restaurants.service.ts`)
**Purpose:** Restaurant data management

**Key Methods:**
- `getRestaurants()` - Fetch all restaurants
- `getRestaurant(id)` - Fetch single restaurant
- `createRestaurant(data)` - Create new restaurant
- `updateRestaurant(id, data)` - Update restaurant
- `deleteRestaurant(id)` - Delete restaurant
- `searchRestaurants(query)` - Algolia search
- `searchRestaurantsWithFilters(query, district, keywords)` - Advanced search
- `getNearbyRestaurants(lat, lng, radiusMetres)` - Proximity search via backend Haversine (v1.15.0)

**Features:**
- Image URL sanitization (em dash fix, v1.5.2)
- Menu item management (sub-collection)

### 4. UserService (`user.service.ts`)
**Purpose:** User profile management

**Key Methods:**
- `getUserProfile(uid)` - Fetch user profile
- `createUserProfile(data)` - Create profile (auto after first login)
- `updateUserProfile(uid, data)` - Update profile
- `updateLoginMetadata(uid)` - Update last login + increment login count
- `updatePreferences(uid, preferences)` - Update user preferences
- `profileExists(uid)` - Check if profile exists
- `deleteUserProfile(uid)` - Delete profile
- `getAllUsers()` - Fetch all user profiles

**Important Fields:**
- `type: 'Diner' | 'Restaurant'` - User type (case insensitive)
- `restaurantId: string` - ID of claimed restaurant (for Restaurant users)

**State:** `currentProfile$: Observable<UserProfile | null>`

**Features:**
- Image URL sanitization (photoURL)
- Retry logic for new user profile creation
- Timestamp conversion helpers

### 5. BookingService (`booking.service.ts`)
**Purpose:** Booking/reservation management

**Key Methods:**
- `getUserBookings(forceRefresh?)` - Fetch user's own bookings (BehaviorSubject cache)
- `getRestaurantBookings(restaurantId)` - Fetch all bookings for a restaurant (owner only; enriched with diner info)
- `getBooking(id)` - Fetch single booking
- `createBooking(data)` - Create new reservation
- `updateBooking(id, data)` - Update booking (dual-ownership, server-enforced field restrictions)
- `deleteBooking(id)` - Delete booking record (server enforces 30-day rule)

**Status values:** `'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'`
**`paymentStatus` and `paymentIntentId` have been removed.**

### 6. ReviewsService (`reviews.service.ts`)
**Purpose:** Restaurant review management

**Key Methods:**
- `getReviews(restaurantId)` - Fetch restaurant reviews
- `createReview(data)` - Submit review
- `updateReview(id, data)` - Update review
- `deleteReview(id)` - Delete review
- `getReviewStats(restaurantId)` - Get review statistics (avg rating, distribution)

**v1.9.0:** Supports `imageUrl` field for review images.

### 7. ChatService (`chat.service.ts`) - v1.4.0, v1.6.1
**Purpose:** Real-time chat via Socket.IO

**Key Methods:**
- `connect()` - Connect to Socket.IO server
- `disconnect()` - Close connection
- `joinRoom(roomId, userId)` - Join chat room
- `leaveRoom(roomId)` - Leave chat room
- `sendMessage(roomId, message, userId, displayName)` - Send message
- `sendTypingIndicator(roomId, isTyping)` - Send typing status

**State:**
- `messages$: Observable<ChatMessage>` - Message stream
- `connectionStatus$: Observable<boolean>` - Connection state
- `isConnected: boolean`, `isRegistered: boolean`

**Features:**
- Connects to `environment.socketUrl` (Railway Socket.IO server)
- Auto-reconnection with exponential backoff (max 5 attempts)
- Typing indicators
- Online/offline status tracking

### 8. GeminiService (`gemini.service.ts`) - v1.4.0
**Purpose:** Google Gemini AI assistant integration

**Key Methods:**
- `chat(message, history?)` - Conversational AI with chat history
- `generate(prompt)` - Text generation
- `askAboutRestaurant(question, restaurantName)` - Restaurant-specific queries
- `getDiningRecommendation(preferences)` - Personalized recommendations

**Features:**
- Chat history management
- Error handling and retry logic
- Bilingual support (EN/TC)

### 9. ChatVisibilityService (`chat-visibility.service.ts`) - v1.8.0
**Purpose:** Manage mutual exclusivity between Chat and Gemini buttons

**Key Methods:**
- `setChatButtonOpen(isOpen)` - Set Chat button state (auto-closes Gemini)
- `setGeminiButtonOpen(isOpen)` - Set Gemini button state (auto-closes Chat)
- `get isChatButtonOpen(): boolean` - Get Chat button state (synchronous)
- `get isGeminiButtonOpen(): boolean` - Get Gemini button state (synchronous)

**State:**
- `chatButtonOpen$: Observable<boolean>`
- `geminiButtonOpen$: Observable<boolean>`

**Purpose:** Prevents overlapping chat interfaces, ensures only one is visible at a time.

### 10. AdvertisementsService (`advertisements.service.ts`) - v1.11.0
**Purpose:** Advertisement CRUD and Firestore persistence management

**Interface:**
```typescript
export interface Advertisement {
  id?: string;
  Title_EN?: string | null;
  Title_TC?: string | null;
  Content_EN?: string | null;
  Content_TC?: string | null;
  Image_EN?: string | null;
  Image_TC?: string | null;
  restaurantId?: string | null;
  userId?: string | null;
  status?: 'active' | 'inactive' | null;
  createdAt?: any;
  modifiedAt?: any;
}

export interface CreateAdvertisementRequest {
  Title_EN?: string | null;
  Title_TC?: string | null;
  Content_EN?: string | null;
  Content_TC?: string | null;
  Image_EN?: string | null;
  Image_TC?: string | null;
  restaurantId: string;
}
```

**Key Methods:**
- `getAdvertisements(restaurantId?: string)` - Fetch all ads (optionally filtered by restaurant)
- `getAdvertisement(id)` - Fetch single ad
- `createAdvertisement(data)` - Create new ad (userId auto-set from token)
- `updateAdvertisement(id, data)` - Update ad (ownership verified)
- `deleteAdvertisement(id)` - Delete ad (ownership verified)

**Features:**
- Bilingual content support (EN/TC with automatic fallback)
- Image URL handling (stored as Firebase Storage signed URLs)
- Ownership verification (userId must match authenticated token)
- Firestore `Advertisements` collection persistence
- Async token retrieval via `switchMap` pattern

### 11. StoreHelpersService (`store-helpers.service.ts`) - v1.8.0
**Purpose:** Utility helper methods for store page operations

**Key Methods:**
- `getTodayBookingsCount(bookings)` - Count today's bookings
- `getPendingBookingsCount(bookings)` - Count pending bookings
- `formatBookingDate(dateTime, lang)` - Bilingual date formatting
- `findDistrictByName(name, lang)` - Find district by EN/TC name
- `findKeywordByName(name, lang)` - Find keyword by EN/TC name
- `formatOpeningHours(hours, lang)` - Format opening hours string
- `isValidTimeFormat(time)` - Validate time format (HH:MM or HH:MM-HH:MM)
- `isBookingEditable(booking)` - Check if booking can be edited
- `getBookingStatusColor(status)` - Get badge color for status
- `isValidCoordinates(lat, lng)` - Validate coordinates

### 12. MessagingService (`messaging.service.ts`) - v1.10.0
**Purpose:** Firebase Cloud Messaging integration for push notifications

**Key Methods:**
- `requestPermission()` - Request notification permission and obtain FCM token
- `getCurrentToken()` - Retrieve current FCM token (from memory or localStorage)
- `getCurrentPermission()` - Get current notification permission status
- `deleteCurrentToken()` - Delete current FCM token and remove from storage
- `refreshToken()` - Refresh FCM token (delete and request new one)
- `subscribeToTopic(token, topic)` - Subscribe to notification topic (requires backend)
- `unsubscribeFromTopic(token, topic)` - Unsubscribe from topic (requires backend)
- `generateNotification(type, params)` - Generate notification from template

**State:**
- `token$: Observable<string | null>` - FCM token changes
- `message$: Observable<NotificationPayload | null>` - Incoming messages
- `permission$: Observable<NotificationPermission>` - Permission status changes

**Features:**
- Foreground and background message handling
- Browser notification display with click actions
- Token persistence in localStorage
- Notification templates for common use cases
- Observable patterns for reactive updates

**Exported Models:**
- `NotificationPayload` - Notification structure
- `NotificationData` - Notification metadata
- `NotificationType` - Notification type enumeration
- `FcmTokenInfo` - Token information
- `SendNotificationRequest` - Backend request structure
- `SendToTopicRequest` - Topic notification request
- `SubscribeToTopicRequest` - Topic subscription request
- `NotificationTemplate` - Template structure
- `NOTIFICATION_TEMPLATES` - Pre-built notification templates

**Service Worker:**
`src/firebase-messaging-sw.js` handles background notifications when app is closed/minimised. Requires Firebase 12.5.0 compat libraries.

**Environment Configuration:**
`fcmVapidKey` must be configured in both `environment.ts` and `environment.prod.ts`. Obtain VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates.

### 13. Other Services
- **GuardService:** Route protection (CanActivate)
- **ThemeService:** Dark/light mode (localStorage)
- **LanguageService:** EN/TC switching (localStorage)
- **PlatformService:** Device detection (`isMobile$`, `isWeb$`, `isNative$`)
- **DataService:** HTTP client wrapper (auto-attaches passcode + auth token)
- **LocationService:** GPS + Haversine distance calculation
- **LayoutService:** UI layout state management
- **SwiperService:** Carousel management
- **UIService:** Toast notifications, loading spinners, alert dialogs
- **MockDataService:** Demo data (sample offers, articles, reviews)

### 14. Service Aggregators (v1.7.0)
**StoreFeatureService:** Consolidates services for store page (restaurants, bookings, user, auth, language, theme, platform)

**RestaurantFeatureService:** Consolidates services for restaurant page (restaurants, reviews, location, bookings, auth, user, language, theme, platform)

**Usage (optional):** Reduces constructor verbosity by ~50%

---

## Shared Components & Dynamic Navigation

### Dynamic Navigation (User Type Specific)
**User Types:** `'Diner'` | `'Restaurant'` (case insensitive, stored in `UserProfile.type`)

**MenuComponent** (`shared/menu/`)
- **Always visible:** Home, Search, Account, Settings (Language, Theme, More Settings)
- **Diner only:** Bookings menu item
- **Restaurant only:** Store menu item
- **Logged in:** Chat menu item

**Observable Pattern:**
```typescript
isRestaurantUser$ = this.userService.currentProfile$.pipe(
  map(profile => profile?.type?.toLowerCase() === 'restaurant')
);
```

**Template Pattern:**
```html
<ion-item *ngIf="!(isRestaurantUser$ | async)">Bookings</ion-item>
<ion-item *ngIf="isRestaurantUser$ | async">Store</ion-item>
```

**TabComponent** (`shared/tab/`)
- **Always visible:** Home, Search, Account tabs
- **Diner only:** Bookings tab
- **Restaurant only:** Store tab
- **Logged in:** Chat tab

### ChatButtonComponent (v1.4.0, v1.6.1)
**Purpose:** Restaurant-customer real-time chat

**Location:** Restaurant detail page (`/restaurant/:id`) only
**Visibility:** Login required (redirects to `/login` if not authenticated)

**Features:**
- Real-time messaging with restaurant owners
- Typing indicators (`chatbox-ellipses-sharp` icon with pulse animation, v1.6.0)
- Image upload support (max 10MB)
- Unread message badges
- Bilingual UI (EN/TC)
- Auto-dimming after 3 seconds

**Room format:** `restaurant-{restaurantId}`

### GeminiButtonComponent (v1.4.0, v1.6.1)
**Purpose:** AI assistant for all users

**Location:** Global (all pages except `/login`)
**Visibility:** No login required (available to all users)
**Position:** Bottom-left corner

**Features:**
- Conversational AI powered by Google Gemini
- Chat history persistence
- Quick suggestion chips
- Loading states with typing indicators
- Modern gradient UI (purple-blue theme)
- Bilingual support (EN/TC)
- Auto-dimming after 3 seconds

### Button Mutual Exclusivity (v1.8.0)
**ChatVisibilityService** ensures only one chat interface (Chat or Gemini) is visible at a time. Opening one automatically closes the other to prevent user confusion from overlapping chat boxes.

---

## Routing & Navigation

| Path | Component | Auth | Titles (EN/TC) |
|------|-----------|------|----------------|
| `/` | → `/home` | ❌ | Redirect |
| `/home` | HomePage | ❌ | Home / 主頁 |
| `/search` | SearchPage | ❌ | Search / 搜尋 |
| `/restaurant/:id` | RestaurantPage | ❌ | Restaurant / 餐廳 |
| `/user` | UserPage | ✅ (GuardService) | Account / 帳戶 |
| `/bookings` | BookingsPage | ✅ | Bookings / 預訂 |
| `/store` | StorePage | ✅ | Store / 商店 |
| `/store/edit-info` | RestaurantInfoModalComponent | ✅ | Edit Restaurant Info / 編輯餐廳資料 |
| `/login` | LoginPage | ❌ | Login / 登入 |
| `/chat` | ChatPage | ❌ | Chat / 聊天 |

**Lazy loading:** PreloadAllModules strategy (all modules preloaded after initial load)

**Route Guards:** GuardService protects authenticated routes, redirects unauthenticated users to `/login`

---

## Security

### Authentication Flow
1. User logs in via Firebase Auth (email/password or Google OAuth)
2. Firebase returns ID token (JWT)
3. Token stored in UserService
4. DataService attaches token to protected API requests
5. Backend verifies token with Firebase Admin SDK
6. Backend extracts UID from verified token
7. Backend uses UID for ownership checks

### Ownership Verification
```javascript
// Backend middleware
const verifyOwnership = (authenticatedUid, resourceUid) => {
  return authenticatedUid === resourceUid;
};
```

### Security Rules
- **Users:** CRUD only own profile (UID must match token)
- **Bookings:** CRUD only own bookings (userId auto-set from token)
- **Reviews:** CUD only own reviews
- **Restaurants:** Currently public (consider admin-only protection for CUD)

### Frontend Security
- Route guards protect authenticated routes
- Tokens stored in service memory (not localStorage to avoid XSS)
- HTTPS enforced in production

### CORS Configuration
**Development:** `cors()` (allows all origins)
**Production:** Restrict to specific domains:
```javascript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```

**Never commit:**
- `API/serviceAccountKey.json`
- `.env` files
- `src/environments/environment.prod.ts`

---

## Styling Conventions

### Hierarchy
```
Global SCSS (lowest specificity)
  ↓
Ionic Theme Variables
  ↓
Tailwind Utilities
  ↓
Component SCSS (highest specificity)
```

### Tailwind CSS
**Build:** `npm run build:tailwind` (compiles `styles.css` → `global.scss`)
**Dark mode:** `class` strategy (toggles `.dark` class on `<html>`)

**Usage:**
```html
<div class="flex items-center p-4 bg-white dark:bg-gray-800">
  <h1 class="text-2xl font-bold">Title</h1>
</div>
```

### Loading States (v1.1.0)
**ALWAYS use Eclipse.gif** (never `ion-spinner`):

```html
<div class="loading-container" *ngIf="isLoading">
  <img src="assets/icon/Eclipse.gif" alt="Loading" class="loading-spinner">
  <p>Loading message</p>
</div>
```

**SCSS:**
```scss
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  gap: 1rem;

  .loading-spinner {
    width: 60px;
    height: 60px;
  }
}
```

### Modern UI Utilities (v1.1.0)
- `.page-container`: Max-width 1400px, centered, responsive padding
- `.content-grid`: Auto-fit grid (min 300px columns)
- `.info-card`: Standard card with border-radius and shadow
- `.highlight-card`: Gradient card (primary → secondary)
- `.section-header`: Flex header with title + action button
- `.error-container`: Error state with icon + message + retry button

### Adaptive Responsive Layouts (v1.4.0)

**Platform detection:**
```typescript
isMobile$ = this.platformService.isMobile$;
```

**Mobile layout (`.mobile-layout`):**
- Zero padding to screen edges (full-width content)
- Hero sections: Full-width, no border radius
- Swiper: `slides-per-view="1.08"` (shows 8% of next card), `space-between="12"`
- Minimal horizontal padding

**Web layout (`.web-layout`):**
- Tablet (768px-1023px): 15% left/right margins (15vw)
- Desktop (1024px+): 20% left/right margins (20vw)
- Hero images: Max-height 33.33vh (1/3 of viewport height)
- Standard padding and spacing

**Implementation:**
```html
<div class="page-container" [class.mobile-layout]="isMobile" [class.web-layout]="!isMobile">
  <swiper-container [class]="isMobile ? 'swiper mobile-peek' : 'swiper'"
                    [attr.slides-per-view]="isMobile ? '1.08' : '1.2'"
                    space-between="12">
    <!-- Swiper slides -->
  </swiper-container>
</div>
```

### Theming (v1.8.0)
- **Badges:** Green color (`--ion-color-success-tint`)
- **Buttons:** Gradient styling on primary colored buttons
- **Chat colors:**
  - User messages: `--ion-background-color`
  - AI/restaurant responses: Gradient backgrounds with forced white text

---

## Testing

**Framework:** Jasmine 5.11.0 + Karma 6.4.4
**Pattern:** `*.spec.ts` files co-located with components
**Run:** `npm test` | `npm test -- --code-coverage`

**Test Structure:**
```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComponentName],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Coverage goals:** 80% statements/functions, 75% branches

---

## Build & Deployment

### Production Build
```bash
npm run build  # → www/
```

**Optimizations:**
- Ahead-of-Time (AOT) compilation
- Tree shaking (removes unused code)
- Minification
- File hashing for cache busting
- Service worker for PWA

### Bundle Budgets
- **Initial bundle:** Max 5MB (warn at 2MB)
- **Component styles:** Max 4KB (warn at 2KB)

### Deployment Options

**1. Firebase Hosting:**
```bash
firebase deploy --only hosting
```

**2. Netlify:**
```bash
netlify deploy --prod --dir=www
```

**3. Native (iOS/Android):**
```bash
npx cap sync ios/android
npx cap open ios/android
# Build in Xcode/Android Studio → Distribute to App Store/Play Store
```

### Service Worker (PWA)
**Config:** `ngsw-config.json`
**Caching strategy:**
- App resources: Prefetch (eager load)
- Assets: Lazy load, update on prefetch

---

## Common Tasks

### Add Page
```bash
ionic generate page pages/page-name
# Add route to app-routing.module.ts
```

### Add Service
```bash
ng generate service services/service-name
# Ensure providedIn: 'root'
```

### Add or Modify API Endpoint
**IMPORTANT:** Always read `..\Vercel-Express-API\API.md` first to:
- Understand existing endpoint patterns
- Verify you're not duplicating functionality
- Follow established conventions

**Steps:**
1. Read `..\Vercel-Express-API\API.md` to check existing endpoints
2. Navigate to `..\Vercel-Express-API\API.js`
3. Add route handler following existing patterns:
```javascript
app.get('/API/NewEndpoint', async (request, response) => {
  try {
    // Logic here
    response.json({ data: 'success' });
  } catch (error) {
    console.error('[ERROR]', error);
    response.status(500).json({ error: 'Failed' });
  }
});
```
4. Update `..\Vercel-Express-API\API.md` with new endpoint documentation
5. Update this CLAUDE.md if major changes
6. Test with Postman/cURL

### Update Dependencies
```bash
npm outdated
npm install package-name@latest --legacy-peer-deps
```

### Debugging
- **Frontend:** Browser DevTools, Console tab, Network tab, Angular DevTools extension
- **Backend:** Terminal output, `[ERROR]` logs
- **Common issues:** CORS, 401 (expired token), 404 (wrong URL), Firebase config errors

---

## Restaurant Claiming Feature (v1.6.0)

**Eligibility:**
- User type = "Restaurant" (case insensitive)
- User's `restaurantId` is null/empty
- Restaurant's `ownerId` is null/empty

**Process:**
1. "Claim This Restaurant" button appears on restaurant page (hero section)
2. Click button → confirmation dialog
3. API call: `POST /API/Restaurants/:id/claim` ✅
4. Success: Redirect to `/store` after 1.5 seconds
5. Failure: Bilingual error messages (EN/TC)

**Error Messages:**
- Already claimed: "This restaurant has already been claimed" / "此餐廳已被認領"
- Already own another: "You already own another restaurant" / "您已經擁有另一間餐廳"
- Not authorized: "You are not authorized" / "您沒有權限"
- Not found: "Restaurant not found" / "找不到此餐廳"

**API Updates:**
- `restaurantId` field set in user profile
- `ownerId` field set in restaurant

---

## Home Page Features (v1.9.0)

**Review Display Strategy:**
- Displays up to 10 reviews in Swiper carousel
- Fetches genuine reviews from Firestore via `ReviewsService`
- If fewer than 10 genuine reviews exist, supplements with mock reviews from `MockDataService`
- Reviews support `imageUrl` field for review images (v1.9.0)

**Review Time Formatting:**
- "Today" for reviews from today
- "Yesterday" for reviews from yesterday
- "X days ago" for reviews within the past week
- "X weeks ago" for reviews within the past month
- "X months ago" for older reviews

**Review Card Features:**
- User avatar (photoURL or initials fallback)
- Star rating display (1-5 stars)
- Review comment text
- Review image display (if imageUrl present)
- Timestamp in human-readable format
- Identical styling to restaurant page reviews

---

## Chat Page User-Type-Specific Messages (v1.6.0)

**For Diner Users (`type: 'Diner'`):**
- **Icon:** `chatbox-ellipses-sharp` (primary color)
- **Message (EN):** "You can chat with restaurant owners on each restaurant page. Look for the floating chat button to communicate directly with restaurants about menus, reservations, or any questions you may have."
- **Message (TC):** "您可以在每個餐廳頁面與餐廳老闆聊天。尋找浮動聊天按鈕，與餐廳直接溝通，詢問菜單、預訂或任何問題。"
- **Action Button:** "Search Restaurants" → `/search`

**For Restaurant Owners (`type: 'Restaurant'`):**
- **Icon:** `chatbox-ellipses-sharp` (success color)
- **Message (EN):** "You will receive customer queries on your restaurant page. When customers have questions or want to make reservations, they can reach you through the chat feature. Please respond promptly to provide the best service!"
- **Message (TC):** "您將在您的餐廳頁面收到來自顧客的查詢。當顧客有問題或想要預訂時，他們可以使用聊天功能與您聯繫。請及時回覆以提供最佳服務！"
- **Action Button:** "Manage My Restaurant" → `/store`

**For Not Logged In Users:**
- Prompt to log in to use chat features
- **Action Button:** "Log In" → `/login`

---

## Socket.IO Chat Architecture (v1.4.0, v1.6.1)

### Dual-Backend Architecture
- **REST API:** Vercel (HTTP endpoints for persistence)
- **Socket.IO:** Railway (WebSocket server for real-time delivery)

### ChatService
**Connection URL:** `environment.socketUrl` (Railway)
**Auto-reconnection:** Exponential backoff (max 5 attempts, 1s → 16s delay)

### Socket.IO Events

**Client → Server (Emitted):**
```typescript
emit('register', { userId, displayName });
emit('join-room', { roomId, userId });
emit('leave-room', { roomId, userId });
emit('send-message', { roomId, userId, displayName, message });
emit('typing', { roomId, userId, displayName, isTyping });
```

**Server → Client (Listened):**
```typescript
on('registered', { success, userId, socketId });
on('joined-room', { roomId, success });
on('new-message', message);
on('user-typing', { roomId, userId, displayName, isTyping });
on('user-online', { userId, displayName, timestamp });
on('user-offline', { userId, displayName, lastSeen });
```

### Connection Lifecycle
1. **Component init:** Subscribe to `ConnectionState$`, `Messages$`
2. **User opens chat:** `connect()` → `registerUser()` → `joinRoom()`
3. **Send message:** Socket.IO (real-time) + REST API (Firestore persistence)
4. **User closes chat:** `leaveRoom()`

### Image Upload Flow
1. User selects image → validate (type, size)
2. Upload to Firebase Storage: `POST /API/Images/upload` ✅ (multipart, max 10MB)
3. Get imageUrl from response
4. Send imageUrl as message via Socket.IO + save to Firestore

### Data Persistence
**Hybrid approach:**
- **Socket.IO:** Real-time message delivery to connected clients
- **REST API:** Firestore persistence for message history
- **On chat open:** Fetch last 50 messages from Firestore via REST API

---

## Known Issues & Fixes

### Em Dash Image URL Bug (v1.5.2)
**Issue:** Backend sanitizes `null` image URLs to `'—'` (em dash), causing browser to fetch from invalid URLs (e.g., `http://localhost:8100/%E2%80%94`), resulting in 404 errors and app freeze.

**Fix:** Added `sanitizeImageUrl()` helper method in `UserService` and `RestaurantsService` to detect `'—'` and return `null`, allowing proper placeholder fallback.

**Affected methods:**
- UserService: `getUserProfile()`, `getAllUsers()`
- RestaurantsService: `searchRestaurants()`, `searchRestaurantsWithFilters()`, `getRestaurantById()`, `getMenuItems()`, `getMenuItem()`

### Store Page Modal Freeze (v1.14.0)
**Issue:** All modals on the store page froze the page on open (page unresponsive).

**Root cause:** `transition: all 0.3s ease` on `ion-card` in `global.scss` applied a CSS transition to every property on every card. When Ionic modal animations changed properties (opacity, transform, etc.), each `ion-card` inside the modal fired multiple `transitionend` events, flooding zone.js and freezing the entire PWA. The RestaurantInfoModal contained 7 `ion-card` elements, making it the worst offender. Three additional `transition: all` rules existed in `store.page.scss`.

**Fix:**
1. Changed `ion-card { transition: all }` to `transition: transform, box-shadow` in `global.scss` — only the properties used by the hover effect.
2. Fixed 3 more `transition: all` rules in `store.page.scss` (`.menu-item-card`, `.extracted-item-row`, `.field-group` inputs).
3. Converted `RestaurantInfoModalComponent` from a modal to a routed sub-page (`/store/edit-info`) — eliminates modal animation entirely for the heaviest component (519 lines TS, 295 lines HTML, 7 cards, Google Maps embed, image upload).

**Files modified:** `src/style/global.scss`, `src/app/pages/store/store.page.scss`, `src/app/pages/store/store-routing.module.ts`, `src/app/pages/store/restaurant-info-modal/restaurant-info-modal.component.ts|html`, `src/app/pages/store/store.page.ts`

### Auth Guard Race Condition (v1.11.1)
**Issue:** When refreshing or re-entering a protected route while logged in, users were spuriously redirected to `/login`, which then auto-redirected to `/user`. Stripe payment redirects to `/store?payment_success=true&session_id=...` were intercepted, losing the session ID and breaking ad creation.

**Root cause:** `AuthGuard.canActivate()` used `take(1)` on `currentUser$` (a BehaviorSubject initialized with `null`). On page load, Firebase's `onAuthStateChanged` needs ~300–800ms to restore the persisted session. By then, `take(1)` had already fired with `null`, so the guard incorrectly rejected the authenticated user.

**Fixes:**
1. Added `authInitialized$` observable to `AuthService` that emits `true` only after the first `onAuthStateChanged` callback completes (both authenticated and unauthenticated branches).
2. Updated `AuthGuard.canActivate()` to wait for `authInitialized$ === true` before checking auth state.
3. Guard now passes `returnUrl: state.url` when redirecting to `/login`, preserving deep links through auth redirects.
4. `LoginPage` now reads the `returnUrl` query param and navigates there after successful auth instead of always to `/user`.
5. `StorePage` persists Stripe `sessionId` to `localStorage['pendingAdSession']` for failsafe recovery if the modal is accidentally closed post-payment.

**Files modified:**
- `AuthService`: Added `authInitializedSubject` and `authInitialized$` observable
- `AuthGuard`: Wait for auth init + pass returnUrl
- `LoginPage`: Use `navigateByUrl(returnUrl)` instead of `navigate(['/user'])`
- `StorePage`: Save/restore Stripe sessions via localStorage

**Result:** Protected routes no longer spuriously redirect while logged in. Stripe payment flow works reliably. All deep links (including payment redirect URLs) are preserved through auth redirects.

---

## Booking Modal Feature (v1.13.0)

**Component:** `BookingModalComponent` (`restaurant/booking-modal.component.ts|html|scss`)

**Triggered by:** Reserve button on restaurant detail page (`restaurant.page.html` line 192)

**UX Flow:**
1. User taps **Reserve** button
2. `openBookingModal()` checks login — redirects to login with `returnUrl` if needed
3. Modal opens with 3 sections:
   - **Date & Time Picker:** Inline `ion-datetime` (24h format, Asia/Hong_Kong timezone, no buttons wrapper)
   - **Opening Hours Status Badge:** Live-updating indicator (green = within hours, amber = outside, grey = unknown)
   - **Guest Stepper:** +/- buttons (1-10 guests)
   - **Special Requests:** Optional textarea
4. User confirms → modal dismisses with `{ dateTime, numberOfGuests, specialRequests }`
5. Parent calls `createBooking()` API → success/error toast

**Opening Hours Evaluation:**
- Uses `Intl.DateTimeFormat` with `timeZone: 'Asia/Hong_Kong'` to extract HK weekday & time from any ISO string
- Matches weekday case-insensitively to `Restaurant.Opening_Hours`
- Parses both string format (`"11:30-21:30"`) and object format (`{ open: "11:30", close: "21:30" }`)
- Supports dash variants: `-`, `–`, `~`
- Badge updates on every datetime change, enabling real-time feedback

**Key Technical Details:**
- `presentation="date-time"` with `[showDefaultButtons]="false"` (values update live via `ionChange`)
- `hour-cycle="h23"` for 24h display
- `minBookingDate` computed with UTC+8 offset to prevent selecting past HK dates
- `ChangeDetectionStrategy.OnPush` — `markForCheck()` on state mutations
- Footer confirm button styled as `.confirm-btn` with rounded corners

**Files:**
- `booking-modal.component.ts` — component logic with opening hours evaluation
- `booking-modal.component.html` — modal template with datetime, badge, stepper, textarea
- `booking-modal.component.scss` — styles for 3-state badge, stepper buttons, datetime picker
- `restaurant.module.ts` — `BookingModalComponent` registered in declarations
- `restaurant.page.ts` — `openBookingModal()` method (login check → present modal → create booking)
- `restaurant.page.html` — Reserve button wired to `openBookingModal()`, inline booking section removed

**User Preferences:**
- Modal language matches current lang setting (EN/TC)
- Form inputs respect user's language choice in button/label text
- Warning toast if booking outside hours (non-blocking — allows submission)

---

## Maps & Directions Feature (v1.15.0)

### Search Page — Map View + Near Me

**Toggle:** `ion-segment` in the sticky search header switches between list and map views.

**Map View:**
- Full Google Map showing markers for all search results
- Clicking a marker opens an InfoWindow with restaurant name, district, image, distance, and "View Details" link
- InfoWindow "View Details" navigates to `/restaurant/:id`
- Map auto-fits bounds to show all markers
- Default centre: Hong Kong (22.3193, 114.1694) or user location if available

**Near Me Chip:**
- Green `ion-chip` with locate icon in the filter area
- Activates GPS via `LocationService.getCurrentLocation()`
- Calls `RestaurantsService.getNearbyRestaurants()` (5km radius)
- Results shown with distance badges (metres/km) in both list and map views
- Map view adds: blue radius circle overlay + blue user location marker
- Infinite scroll disabled when Near Me is active (finite result set)
- Deactivating reverts to normal Algolia search

**Files:**
- `search.page.ts` — `viewMode`, `activateNearMe()`, `deactivateNearMe()`, `initializeSearchMap()`, `updateMapMarkers()`, `cleanupMap()`
- `search.page.html` — View toggle segment, Near Me chip, map container, distance badges on cards
- `search.page.scss` — Map container (55vh mobile, 60vh tablet, 65vh desktop), near-me chip active state

### Restaurant Page — Get Directions

**Button:** "Get Directions" / "路線導航" button below the embedded map on the restaurant detail page.

**Behaviour:** Opens the fullscreen `MapModalComponent` with `showDirections: true`. No inline directions rendering — keeps the restaurant page simple.

### Fullscreen Map Modal — Directions

**Component:** `MapModalComponent` (`restaurant/map-modal.component.ts`)

**Props:** `latitude`, `longitude`, `showDirections` (boolean), `restaurantName` (string), `lang` ('EN'|'TC')

**Directions Features:**
- Travel mode segment: Transit / Walking / Driving / Cycling
- Default: TRANSIT (Hong Kong has excellent public transport)
- Route rendered via `google.maps.DirectionsService` + `DirectionsRenderer`
- Route info bar: duration + distance from the API response
- Loading state with Eclipse.gif whilst fetching location/directions
- Error handling: ZERO_RESULTS, permission denied, generic errors — all bilingual
- "Open in Google Maps" fallback button (opens external Maps with directions URL)
- Toolbar shows restaurant name; external link button in toolbar

**Bilingual Labels:**
- Transit / 公共交通, Walking / 步行, Driving / 駕車, Cycling / 騎車
- Get Directions / 路線導航, Close / 關閉
- Open in Google Maps / 在 Google Maps 開啟
- Error messages in both EN and TC

### RestaurantsService — getNearbyRestaurants()

```typescript
getNearbyRestaurants(lat: number, lng: number, radiusMetres: number = 5000): Observable<(Restaurant & { distance: number })[]>
```
- Calls backend `GET /API/Restaurants/nearby?lat=X&lng=Y&radius=Z`
- Sanitises ImageUrl/Payments (reuses existing helpers)
- Returns restaurants sorted by distance with `distance` field in metres

---

## AI Assistant Guidelines

### Principles
1. **Read before writing:** Always read existing files before modifying
2. **Consult API documentation:** Before using or modifying API endpoints, **read `..\Vercel-Express-API\API.md`** to verify endpoint specifications
3. **Follow conventions:** Use established patterns (naming, structure, style)
4. **Minimal changes:** Only modify what's necessary; avoid refactoring unless asked
5. **Security first:** Never introduce vulnerabilities (XSS, SQL injection, etc.)
6. **No emojis:** Avoid emojis unless explicitly requested

### Code Patterns

**Service:**
```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private data = new BehaviorSubject<T>(initialValue);
  public data$ = this.data.asObservable();

  updateData(newValue: T) {
    this.data.next(newValue);
  }
}
```

**Component:**
```typescript
export class MyPage implements OnInit {
  data$: Observable<T>;

  constructor(private service: MyService) {}

  ngOnInit() {
    this.data$ = this.service.data$;
  }
}
```

**API Endpoint:**
```javascript
app.method('/API/Resource', authenticate, async (request, response) => {
  try {
    // 1. Extract & validate params
    // 2. Check ownership if protected
    // 3. Perform operation
    // 4. Return response
  } catch (error) {
    console.error('[ERROR]', error);
    response.status(500).json({ error: 'Message' });
  }
});
```

### Security Checklist (Protected Endpoints)
- ✅ Use `authenticate` middleware
- ✅ Get authenticated UID: `getAuthenticatedUid(request)`
- ✅ Verify ownership: `verifyOwnership(authUid, resourceUid)`
- ✅ Return 403 if ownership check fails
- ✅ Auto-set `userId` on creation (don't trust client)
- ✅ Log security violations

### Things to Avoid
1. Don't add comments to code you didn't change
2. Don't add error handling for impossible scenarios
3. Don't create abstractions for single-use code
4. Don't use `any` type in TypeScript
5. Don't use `ion-spinner` (always use Eclipse.gif)
6. Don't create documentation files unless asked
7. Don't expose sensitive data in logs
8. Don't skip ownership checks on protected routes
9. **Never use `transition: all` in CSS** — it causes `transitionend` events to flood zone.js during Ionic modal animations, freezing the entire PWA. Always scope transitions to specific properties (e.g. `transition: transform 0.3s ease, box-shadow 0.3s ease`)

### When Making Changes

**Frontend:**
1. Read existing component/service
2. Understand current patterns
3. Make minimal necessary changes
4. Update spec file if logic changes
5. Test in browser if UI changes

**Backend:**
1. **Read `..\Vercel-Express-API\API.md` first** to understand current API specifications
2. Read API.js in `..\Vercel-Express-API` to understand endpoint structure
3. Follow existing error handling pattern
4. Add authentication if needed
5. Add ownership verification if modifying user data
6. Update API.md documentation if you modify/add endpoints
7. Test with Postman/curl

### Commit Messages
```
<type>: <short description>

<optional body>
```

**Types:** `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `chore`

**Examples:**
- `feat: Add booking cancellation endpoint`
- `fix: Resolve authentication token expiry issue`
- `refactor: Extract ownership verification to helper`

### Understanding Request Context

**"Add feature X":**
1. Research existing similar features
2. Identify affected files (service, component, API)
3. Read all affected files
4. Make changes following established patterns
5. Update tests

**"Fix bug Y":**
1. Locate bug source (use Grep/Glob)
2. Read surrounding context
3. Understand why bug exists
4. Fix minimally without side effects
5. Add test to prevent regression

**"Refactor Z":**
1. Understand current implementation fully
2. Identify code smells
3. Refactor incrementally
4. Ensure tests still pass
5. No functional changes

### When Stuck
1. **Read existing code:** Look for similar implementations
2. **Check service layer:** Most logic lives in services
3. **Verify environment config:** Check if API URL/keys are correct
4. **Check browser console:** Frontend errors show here
5. **Check API logs:** Backend errors logged to terminal
6. **Ask user:** If requirements unclear, ask for clarification

---

## Quick Reference

### Key Files
- **`..\Vercel-Express-API\API.md`** - **API documentation (READ FIRST for endpoint info)**
- `..\Vercel-Express-API\API.js` - Backend API implementation
- `..\Railway-Socket\` - Socket.IO server implementation
- `src/app/app-routing.module.ts` - Route configuration
- `src/app/services/*.service.ts` - Business logic (22 services)
- `src/environments/environment.ts` - Config (Firebase, API URLs, Algolia)
- `package.json` - Scripts + dependencies
- `angular.json` - Build configuration

### Commands
```bash
npm run dev              # Full stack (API + frontend)
npm start                # Frontend only (port 4200)
npm run start:api        # Backend only (port 3000)
npm test                 # Run tests
npm run build            # Production build → www/
npm run lint             # ESLint
npx cap sync             # Sync to native projects
```

### Firestore Collections
- `Restaurants` - Restaurant data
- `Users` - User profiles
- `Bookings` - Reservations
- `Reviews` - Restaurant reviews
- `Advertisements` - Promoted restaurant ads (v1.11.0)

### Auth Flow
```
Login → Firebase → ID Token → UserService → DataService (auto-attach) →
API (verify) → Extract UID → Ownership checks
```

---

**Document Version:** 1.15.2 | **Maintainer:** AI Assistant

**Changelog:**
- **v1.15.2** (2026-03-21): **Search card star ratings, thumbnail fix, Near Me icon fix.** (1) Near Me chip icon now uses explicit `*ngIf` switch between `locate` (filled, when active/loading) and `locate-outline` (default), fixing Ionicons dynamic `[name]` binding issue. (2) Restaurant card thumbnails now fill edge-to-edge: added `&::part(native) { padding: 0; }` to remove Ionic `ion-card` default inner padding. (3) Added star ratings to search result cards and map InfoWindows. New backend endpoint `GET /API/Reviews/batch-stats?restaurantIds=id1,id2,...` (max 50 IDs) returns `{ [restaurantId]: { totalReviews, averageRating } }` using Firestore `in` queries (chunked at 30). Frontend: `ReviewsService.getBatchStats()` method, `SearchPage.ratingMap` populated after each search/nearby call, rating row shows `★★★★☆ (12)` with gold star colour. (4) Updated `ReviewsService` exports with `getBatchStats()` method.
- **v1.15.1** (2026-03-21): **Search page UX + map modal alignment + claim restaurant gate.** (1) Near Me chip now shows filled `locate` icon immediately when clicked (during loading state). (2) Search result cards restructured to 50/50 layout: thumbnail (16:9 `aspect-ratio`) on top with opening-status badge (`Open`/`Closed` overlaid bottom-left) and compact info below (name, district, distance). Opening status computed from `Opening_Hours` using `Intl.DateTimeFormat` with `Asia/Hong_Kong` timezone. `getOpeningStatus()` helper added to `SearchPage`. (3) Map InfoWindow redesigned: whole card is an `<a>` tag linking to `/restaurant/:id` (replaces separate "View Details" link), includes thumbnail, name, district, distance + opening badge. (4) Map modal alignment fixed by removing the mobile `@media (max-width: 768px)` CSS rule that applied `margin: 10vh auto` and `height: 80vh`, causing the map to float inside the modal. Map container now fills 100% of `ion-content` on all screen sizes. (5) Claim/edit restaurant restricted to Restaurant-type users without a `restaurantId`: `canEditRestaurant` is now set inside `checkClaimEligibility`'s async profile callback (same conditions as `canClaimRestaurant`). `checkEditPermission()` defaults to `false` and lets the async check override it. Diner users and already-claimed restaurant owners no longer see the "Edit Restaurant Image" card on unclaimed restaurant pages.
- **v1.15.0** (2026-03-21): **Enhanced Google Maps features — map view on search page, Near Me proximity search, and directions.** Added `getNearbyRestaurants()` to `RestaurantsService` calling backend `GET /API/Restaurants/nearby` (Haversine, 5km default radius). Search page: list/map view toggle via `ion-segment`, map shows markers for all search results with InfoWindow (name, district, image, "View Details" link). "Near Me" chip requests GPS, fetches nearby restaurants, shows distance badges on cards and radius circle on map. Restaurant page: "Get Directions" button opens fullscreen `MapModalComponent` with directions. `MapModalComponent` enhanced: `DirectionsService`/`DirectionsRenderer` integration, travel mode segment (Transit/Walking/Driving/Cycling, default Transit for HK), route info bar (duration + distance), error handling with "Open in Google Maps" fallback. All new UI text bilingual (EN/TC). Fixed 2 `transition: all` rules in `search.page.scss` → scoped to `transform, box-shadow`.
- **v1.14.0** (2026-03-19): **Store page modal freeze fix + RestaurantInfoModal converted to sub-page.** Root cause: `transition: all 0.3s ease` on `ion-card` in `global.scss` flooded zone.js with `transitionend` events during Ionic modal animations (same class of bug as the `*` selector fix in v1.0). Fixed by scoping transitions to only the properties used in hover effects (`transform`, `box-shadow`). Also fixed 3 additional `transition: all` rules in `store.page.scss`. `RestaurantInfoModalComponent` (519 lines TS, 7 cards, Google Maps, image upload) converted from modal to routed sub-page at `/store/edit-info` — uses `ionViewWillEnter` on StorePage to reload data on return. Remaining store modals (AdModal, MenuItemModal, BulkMenuImportModal) keep modal pattern; CSS fix resolves freeze for them.
- **v1.13.0** (2026-03-05): **Booking modal with opening hours awareness.** Replaced inline booking form with `BookingModalComponent` modal (triggered by Reserve button). Modal features: inline `ion-datetime` (24h HK timezone), live opening hours status badge (green/amber/grey), guest stepper (1-10), special requests textarea, confirmation footer button. Opens after login check; shows warning toast if booking outside hours (non-blocking). Uses `Intl.DateTimeFormat` with `Asia/Hong_Kong` timezone to reliably extract HK weekday/time from any ISO datetime. Opening hours parsing supports both string (`"11:30-21:30"`) and object (`{open,close}`) formats with dash variants (`-`, `–`, `~`). UX: tap Reserve → login if needed → pick date/time/guests → confirm → toast feedback. Bilingual (EN/TC) throughout.
- **v1.12.0** (2026-03-04): **Booking system overhaul — payment logic removed, accept/decline workflow added.** Status values changed from `pending/confirmed/cancelled` to `pending/accepted/declined/cancelled/completed`. `paymentStatus`/`paymentIntentId` removed from all booking operations. New `declineMessage` field (set by restaurant owner on decline). Added `GET /restaurant/:restaurantId` endpoint (owner-only, enriches each booking with diner displayName/email/phoneNumber). `PUT /:id` now supports dual-ownership: diners can edit/cancel pending bookings; restaurant owners can accept/decline/complete. `DELETE /:id` enforces 30-day rule. Diner booking page: added edit/delete actions, declined status tab, decline message display. Store page: added status filter tabs (Pending/Accepted/Declined/Cancelled/All), diner info per card, Accept/Decline buttons with optional decline message, chat button.
- **v1.11.1** (2026-03-04): **Critical auth guard race condition fix.** Fixed spurious redirects to `/login` when refreshing or re-entering protected pages while logged in. **Root cause:** `AuthGuard.canActivate()` used `take(1)` on a BehaviorSubject initialized with `null`, firing before Firebase's `onAuthStateChanged` could restore the persisted session (~300-800ms delay). **Fixes:** (1) Added `authInitialized$` observable to `AuthService` that emits `true` only after the first `onAuthStateChanged` callback. (2) Guard now waits for `authInitialized$` before checking auth state. (3) Guard passes `returnUrl` query param when redirecting, preserving deep links (esp. Stripe's `?payment_success=true&session_id=...`). (4) LoginPage now reads `returnUrl` and navigates there post-auth instead of always `/user`. (5) Added localStorage failsafe in StorePage: saves pending ad sessions to localStorage, allowing users to resume ad creation if modal is accidentally closed after Stripe payment. **Result:** Stripe payment flow now works reliably; all deep links preserved through auth redirects.
- **v1.11.0** (2026-03-04): Advertisement placement system with Stripe payment integration. Added `advertisements.service.ts` for Firestore CRUD. Implemented `AdModalComponent` for bilingual ad creation (EN/TC) with image uploads. Added `/API/Advertisements` CRUD endpoints and `POST /API/Stripe/create-ad-checkout-session` for HK$10 payments. Updated StorePage with ad management UI and payment flow. Overhauled HomePage to fetch and display real Firestore ads alongside mock offers with bilingual support. Introduced language fallback pattern for bilingual fields. Updated from 23 to 24 core services.
- **v1.10.0** (2025-01-29): Added Firebase Cloud Messaging (FCM) support via MessagingService. Push notifications for bookings, reviews, and chat messages. Service exports all models directly (NotificationPayload, NotificationData, NotificationType, etc.). Requires VAPID key configuration in environment files. Background notifications handled by `firebase-messaging-sw.js` service worker. Updated from 22 to 23 core services.
- **v1.9.2** (2025-01-15): **Condensed documentation from 128k to 50k characters whilst preserving all features.** Added critical API documentation references: Backend repositories located in sibling directories (`..\Vercel-Express-API`, `..\Railway-Socket`). **IMPORTANT:** AI agents must read `..\Vercel-Express-API\API.md` before using/modifying endpoints. Updated AI Assistant Guidelines with API consultation requirements. Enhanced "Add API Endpoint" section with mandatory API.md review steps.
- **v1.9.1** (2025-12-13): Added ChatVisibilityService, StoreHelpersService documentation. Enhanced UserService section with type/restaurantId fields, updateLoginMetadata, updatePreferences methods. Added dynamic navigation documentation (MenuComponent, TabComponent user-type-specific behavior).
- **v1.9.0** (2025-12-11): Review images support (imageUrl field), genuine reviews on home page (fetches from Firestore, supplements with mock data if needed).
- **v1.8.0** (2025-12-08): UI improvements (green badges, gradient buttons, Eclipse.gif loading). ChatVisibilityService for button mutual exclusivity. StoreHelpersService utility methods. Chat/Gemini chatbox color updates.
- **v1.7.0** (2025-12-03): Performance optimization release (split constants, AppStateService fixes circular dependency, OnPush change detection, service aggregators). ~35% faster compilation, ~50-60% faster UI.
- **v1.6.1** (2025-12-03): ChatService socketUrl fix (connects to Railway, not Vercel). GeminiButton no login required, ChatButton login required.
- **v1.6.0** (2025-12-03): Restaurant claiming feature, Chat page user-type-specific messages, typing indicator update (chatbox-ellipses-sharp icon).
- **v1.5.2** (2025-12-02): Em dash image URL bug fix (sanitizeImageUrl in UserService, RestaurantsService).
- **v1.5.1** (2025-11-30): Global margin fix, theme updates.
- **v1.5.0** (2025-11-30): Swiper fixes, theme-aware branding, restaurant page redesign.
- **v1.4.0** (2025-11-29): Adaptive responsive layouts (mobile/web), API documentation updates.
- **v1.3** (2025-11-27): AppStateService, DataService refactor, modern UI utilities.
- **v1.2** (2025-11-27): Socket.IO + Gemini integration.
- **v1.1** (2025-11-27): Eclipse.gif loading states.
- **v1.0** (2025-11-26): Initial documentation.
