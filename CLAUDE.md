# CLAUDE.md - AI Assistant Guide for Cross-Platform-Assignment

> **Last Updated:** 2026-04-19 | **Version:** 1.17.31 | **Angular:** 20.3.3 | **Ionic:** 8.7.9
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
│   │   ├── add-restaurant-modal/             # Create new restaurant modal (v1.16.0)
│   │   ├── menu-item-modal/                  # Add/edit menu item modal
│   │   ├── bulk-menu-import-modal/           # DocuPipe bulk import modal
│   │   └── menu-qr-modal/                    # QR code generator modal (v1.17.0)
│   ├── login/                 # Authentication
│   ├── chat/                  # Chat overview page
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
│   ├── gemini-button/         # AI assistant (global, no login)
│   └── qr-scanner/            # QR scanner modal (global, no login) (v1.17.0)
└── environments/              # Environment configs
    ├── environment.ts         # Development
    └── environment.prod.ts    # Production
```

**Backend Repositories (Sibling Directories):**
- **REST API:** `..\Vercel-Express-API` (deployed to Vercel)
- **Socket.IO:** `..\Railway-Socket` (deployed to Railway)

**IMPORTANT FOR AI AGENTS:**
Treat `CLAUDE.md` as the canonical companion AGENT/session log for this repo. Read `CLAUDE.md` at the start of every session and update `CLAUDE.md` before ending every session.

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
**Native Bridge:** Capacitor 8.3.0
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
| POST | `/restaurant-description` | ❌ | Generate restaurant description or chat about a restaurant (`restaurantId`, `message`, `history[]` — server fetches restaurant info + menu from Firestore) |
| POST | `/restaurant-advertisement` | ✅ | Generate bilingual ad content (`restaurantId`, `name`, `district`, `keywords[]`, `message?` — server fetches menu from Firestore; returns `AdvertisementGenerationResponse`) |

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
  rating: number;                // Auto-maintained average (0 if no reviews, 1 dp). Updated by API on review create/update/delete.
  createdAt, modifiedAt: Timestamp;
}
```

**Star display:** `formatRatingStars(rating)` rounds to nearest 0.5 via `Math.round(rating * 2) / 2`.
Defined in `reviews.service.ts` (authoritative), `home.page.ts`, and `search.page.ts` (local copies).
Cards show `★★★½☆ 3.7`; detail page hero shows `stars + number` from `restaurant.rating` directly.

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
- Search now routes through the backend `/API/Algolia/Restaurants` endpoint only. Do not restore eager direct Algolia client initialization inside `RestaurantsService`; that dead constructor-time path broke native route activation on pages that inject the service (Home/Search/Store/QR scanner).

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
- `chat(message, includeHistory?)` - Conversational AI with chat history
- `generate(prompt)` - Text generation
- `chatAboutRestaurant(restaurantId, message, includeHistory?)` - Restaurant-context chat; server fetches restaurant info + menu from Firestore automatically (preferred on restaurant detail pages)
- `generateAdvertisement(restaurantId, name, district, keywords?, message?)` - Generate bilingual ad content (auth required; returns `AdvertisementGenerationResponse`)
- `askAboutRestaurant(question, restaurantName?)` - Quick helper wrapping `chat()`
- `getDiningRecommendation(preferences)` - Personalized recommendations

**Exported Interfaces:**
- `ChatHistoryEntry` — `{ role: 'user' | 'model', parts: string }`
- `AdvertisementGenerationResponse` — `{ Title_EN, Title_TC, Content_EN, Content_TC, restaurant: { name, district, keywords[] } }`
- `GeminiResponse` — raw API response shape

**Features:**
- Chat history management (`chatHistory$` BehaviorSubject)
- `isLoading$` observable for UI loading states
- Restaurant-context routing in `GeminiButtonComponent`: on `/restaurant/:id` pages, `sendMessage()` automatically calls `chatAboutRestaurant()` instead of `chat()`; context-specific "What is on the menu?" suggestion chip added
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

### 12. MessagingService (`messaging.service.ts`) - v1.13.0
**Purpose:** Firebase Cloud Messaging integration for push notifications, including server-side token registration so the API can deliver notifications directly to devices.

**Key Methods:**
- `requestPermission()` - Request notification permission, obtain FCM token, and store in localStorage
- `getCurrentToken()` - Retrieve current FCM token (from memory or localStorage)
- `getCurrentPermission()` - Get current notification permission status
- `deleteCurrentToken(authToken?)` - Delete FCM token from Firebase SDK and localStorage; if `authToken` is provided, also removes the token from the backend via `DELETE /API/Messaging/register-token`
- `refreshToken()` - Refresh FCM token (delete and request new one)
- `registerTokenWithBackend(fcmToken, authToken)` - POST to `POST /API/Messaging/register-token`; stores token in `Users/{uid}.fcmTokens` via `arrayUnion` so the server can send push notifications to this device
- `removeTokenFromBackend(fcmToken, authToken)` - DELETE to `/API/Messaging/register-token`; removes token from `Users/{uid}.fcmTokens`
- `subscribeToTopic(token, topic, authToken)` - POST to `/API/Messaging/subscribe` (previously a no-op stub)
- `unsubscribeFromTopic(token, topic, authToken)` - POST to `/API/Messaging/unsubscribe` (previously a no-op stub)
- `generateNotification(type, params)` - Generate notification from template

**State:**
- `token$: Observable<string | null>` - FCM token changes
- `message$: Observable<NotificationPayload | null>` - Incoming messages
- `permission$: Observable<NotificationPermission>` - Permission status changes

**Token registration flow:**
`app.component.ts` calls `registerTokenWithBackend()` immediately after the user grants permission (both the auto-grant path and the "Allow" button path). It obtains a fresh Firebase ID token via `getIdToken(auth.currentUser)` from `@angular/fire/auth` before calling the API. This ensures the server always has an up-to-date token for the current user.

**Notification deeplinks (set in FCM `data.url` by the server):**
- `pourrice://bookings` — booking status notifications; client opens the Bookings or Store Bookings Management page
- `pourrice://chat/{roomId}` — new chat message notifications; client opens that chat room

**Features:**
- Foreground and background message handling
- Browser notification display with click actions
- Token persistence in localStorage and Firestore (`Users/{uid}.fcmTokens`)
- Notification templates for common use cases
- Observable patterns for reactive updates

**Exported Models:**
- `NotificationPayload` - Notification structure
- `NotificationData` - Notification metadata (includes `url`, `roomId`, `bookingId`, `type`)
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
- **QrScannerModalComponent** (`shared/qr-scanner/`): Decodes `pourrice://menu/{restaurantId}` QR codes. Native: `@capacitor-mlkit/barcode-scanning` startScan() with transparent WebView. Web: `getUserMedia` + `BarcodeDetector` API (Chrome/Edge 83+). Accessible from nav drawer — no login required. CSS class `.barcode-scanner-active` on `<html>` makes WebView transparent during native scanning (defined in `global.scss`).
- **MenuQrModalComponent** (`store/menu-qr-modal/`): Generates the `pourrice://menu/{restaurantId}` QR code using the `qrcode` npm package on a `<canvas>`. Features: display, full-screen expand, download as PNG. Store page menu section — restaurant owners only.
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

### QR Code Features (v1.17.0)

**Deep-link format:** `pourrice://menu/{restaurantId}` — identical across iOS, Android, and PWA.

**QR Generator (restaurant owners — Store page → Menu tab):**
- `MenuQrModalComponent` renders QR on a `<canvas>` via `qrcode` npm package
- Error correction level H (30% redundancy — matches Android implementation)
- Expand button shows 300 px fullscreen overlay for easy counter scanning
- Download button exports a 600 px PNG via `<a download>` anchor
- Opened via "Menu QR Code" button in the Menu section action bar

**QR Scanner (all users — nav drawer):**
- `QrScannerModalComponent` opened from "Scan QR Code" item in `MenuComponent`
- **Native (iOS/Android):** `@capacitor-mlkit/barcode-scanning` v8 `startScan()` with `.barcode-scanner-active` on `<html>` making the WebView transparent; native camera renders beneath. Torch toggle available.
- **Web (Chrome/Edge 83+):** `getUserMedia({ facingMode: 'environment' })` → `<video>` element + `BarcodeDetector` API polling every 400 ms.
- **Web fallback:** If `BarcodeDetector` is unavailable, shows an informational message prompting the user to use Chrome/Edge or the native app.
- On a valid scan: validates URL scheme (`pourrice:` + hostname `menu`), fetches restaurant via `RestaurantsService.getRestaurantById()`, then navigates to `/restaurant/:id`.
- CSS modal class `.qr-scanner-modal` (full-screen, no border-radius) defined in `src/style/global.scss`.

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

### Server-triggered Android FCM notifications missing whilst Firebase Console notifications still worked (v1.17.31)
**Issue:** The Android Capacitor app variant `com.example.cross_platform_assignment` could receive Firebase Console / recurring notifications, but server-triggered chat-message and booking-status FCM notifications from `..\Vercel-Express-API\API\Routes\Messaging.ts` did not reliably arrive. Console delivery and Admin SDK delivery diverged because Console uses Firebase's app-recipient registry, while the backend sends only to whatever token records are stored on `Users/{uid}.fcmTokens` in Firestore.

**Root cause:** The failure lived in the registration → storage → send → cleanup loop, not in the Android manifest/channel setup. Four gaps combined here: (1) Firestore stored untagged plain-string tokens, so native Android tokens for `com.example.cross_platform_assignment` were indistinguishable from stale legacy web tokens. (2) Stale-token cleanup only removed `messaging/registration-token-not-registered`, leaving other terminal token errors behind indefinitely. (3) Send logging only reported aggregate success/failure counts, so Vercel logs could not reveal which token or error code actually failed. (4) There was no authenticated diagnostics endpoint to confirm whether the current device had registered the correct tagged native token. A related overwrite risk also existed: `POST /API/Users` created profiles with plain `set(payload)`, so an early token registration could be wiped if profile creation happened afterwards during first-run auth restoration.

**Fix:** `MessagingService.registerTokenWithBackend()` now sends tagged metadata (`platform` plus `appId`, with Android using `com.example.cross_platform_assignment`). The Vercel API now stores `fcmTokens` as tagged objects, skips legacy plain strings on send, logs per-token failures with error codes, sanitises FCM `data` payloads to string-only keys, removes tokens for broader terminal FCM error codes, and exposes `GET /API/Messaging/diagnostics` for authenticated token inspection. `POST /API/Users` now uses merge semantics so profile creation no longer overwrites freshly registered FCM tokens. `com.example.android_assignment` remains a separate Android Firebase client in `google-services.json` and is not the runtime package used by this app.

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

### Android Blank Pages + Menu Overlap + OAuth Redirect (v1.17.4)

**Issue:** First physical Android device test (Samsung S24U, Android 16) revealed: (1) all pages except Login/Chat showed blank content, (2) side menu items overlapped with the header, (3) Google Sign-in opened system browser and couldn't return to the app.

**Root causes:**
1. **Blank pages:** `*ngIf="isMobile$ | async as isMobile"` wrapping all page content. When `isMobile$` emitted `false`, `*ngIf` evaluated it as falsy and removed the entire DOM subtree. The `as isMobile` syntax assigns the emitted boolean value, not just its presence.
2. **Menu overlap:** PR #51 replaced `<ion-content>` with `<div class="app-shell">` using `overflow: hidden`, `position: absolute` on router-outlet, and `position: fixed` + high z-index on header — broke Ionic's layout system on Android WebView.
3. **OAuth redirect:** `signInWithPopup()` opens system browser on Android (not in-app), with no way to return to the Capacitor app.
4. **Capacitor v7/v8 mismatch:** `@capacitor/core` v8 with `@capacitor/android` v7 caused potential bridge failures.

**Fixes:**
1. Replaced `*ngIf` with always-truthy object wrapper: `*ngIf="{ mobile: (isMobile$ | async) ?? false } as platform"` — object `{}` is always truthy, `?? false` provides safe default while `PlatformService.earlyMobileCheck()` ensures correct synchronous value.
2. Reverted to `<div class="ion-page">` wrapper, `type="overlay"` menu, removed all z-index/position hacks.
3. Added `signInWithRedirect()` on native platforms, deep link intent filter in AndroidManifest, `androidScheme: 'https'` in Capacitor config, deep link listener in `app.component.ts`.
4. Aligned `@capacitor/android` and `@capacitor/ios` to v8.3.0.

**Key learning:** The `*ngIf="observable$ | async as value"` pattern is dangerous for layout wrappers — `false` removes the DOM. Use the object wrapper pattern instead. Login/Chat pages worked because they didn't use this pattern.

**Files modified:** 6 page templates, `app.component.html/scss/ts`, `auth.service.ts`, `platform.service.ts`, `capacitor.config.ts`, `AndroidManifest.xml`, `gradle-wrapper.properties`, `package.json`.

### Google Maps Search View — Map Marker Rendering (v1.15.3)
**Issue:** When searching while in map view (or switching to map view during search), Google Maps markers failed to render until navigating away and back.

**Root cause:** Search triggers loading state via `isLoading = true`, which causes `*ngIf="viewMode === 'map' && !isLoading && !isNearMeLoading"` to remove the `#search-map` DOM container from the DOM tree. The Google Maps instance (`this.map`) remained in memory but now referenced a detached (invisible) element. When loading completed and `isLoading = false`, a new `#search-map` div was inserted, but `this.map` still pointed to the old detached element, so markers appeared on an invisible ghost map.

**Fixes:**
1. **In `performSearch()` (lines 237-242):** Added `if (this.viewMode === 'map') { this.cleanupMap(); }` before setting `isLoading = true` when in map view. This nulls the ghost map reference before the `*ngIf` removes the DOM container, forcing `initializeSearchMap()` to create a fresh map instance when search completes.
2. **In `initializeSearchMap()` (lines 587-592):** Added restoration of Near Me overlays after marker placement if `isNearMeActive && userLocation`. This ensures the user location marker and 5km radius circle are redrawn when the map is reinitialized during a search in Near Me mode.

**Architecture:** Google Maps in search page uses shared `this.restaurants` data populated by Algolia search (via `performSearch()`), not a separate direct Algolia query. Both list and map views call `getDisplayRestaurants()`, ensuring they always display the same results. Users can search via the sticky search bar in any view mode; markers update immediately after the fixes.

**Files modified:** `src/app/pages/search/search.page.ts` (performSearch, initializeSearchMap methods)

### Google One Tap — `origin_mismatch` / `disallowed_useragent` (v1.17.5)

**Issues (two separate errors):**
1. **Android:** `Error 403: disallowed_useragent` — Google blocks OAuth flows inside Capacitor's WebView (not a "secure browser").
2. **Web:** `Error 400: origin_mismatch` — Google One Tap's GSI library sends the page's JavaScript origin to Google; if that origin is not registered in Google Cloud Console the prompt opens an error page.

**Root causes:**
1. Android used `signInWithRedirect()` which navigated the WebView to `accounts.google.com` — Google rejects embedded WebViews as the user agent.
2. One Tap (GSI) runs its iframe on the app's page, so Google validates `window.origin` against the "Authorized JavaScript origins" list for the OAuth client. `localhost:4200` and the production URL were not registered.

**Fixes:**
1. **Android — replaced with native SDK:** `@capgo/capacitor-social-login` installed. `AuthService.signInWithGoogle()` now calls `SocialLogin.login({ provider: 'google' })` on native platforms — shows the system account picker sheet, zero browser involvement. `SocialLogin.initialize({ google: { webClientId } })` called in `AppComponent.ngOnInit()`. `handleRedirectResult()` removed from `AuthService`. `com.example.app://callback` intent filter removed from `AndroidManifest.xml`. `accounts.google.com` removed from `capacitor.config.ts` `allowNavigation`.
2. **Web One Tap — added `use_fedcm_for_prompt: true`:** FedCM (Chrome 108+) replaces the old iframe-based One Tap flow; the browser mediates the credential exchange natively and does not perform the same JavaScript-origin check. Falls back to legacy One Tap on older browsers. Added `itp_support: true` for Safari. Added a `prompt(notification => ...)` callback so failed/suppressed prompts log silently instead of opening an error page.

**Remaining manual step for full One Tap support on non-FedCM browsers:**
Register the following in **Google Cloud Console → APIs & Services → Credentials → [Web OAuth client] → Authorized JavaScript origins**:
- `http://localhost:4200` (development)
- `http://localhost:8100` (Ionic dev server)
- `https://<your-production-domain>` (PWA production URL)

The OAuth client ID is `937491674619-r1e5di42mi8tdgkqfhe2fubdms7jks9f.apps.googleusercontent.com`.

**Also required for Android native Sign-In (`@capgo/capacitor-social-login`):**
Register the app's **SHA-1 debug fingerprint** in **Firebase Console → Project Settings → Your Android app → Add fingerprint**, then re-download `google-services.json` and re-run `npx cap sync`.

**Files modified:** `auth.service.ts`, `app.component.ts`, `capacitor.config.ts`, `AndroidManifest.xml`, `login.page.ts`, `package.json`.

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
10. ~~**Never use `<ion-router-outlet>` in a custom div shell** — superseded by rule 11.~~
11. **Never use plain Angular `<router-outlet>` in an Ionic app.** `<ion-router-outlet>` should remain the primary routed viewport and should sit directly under `<ion-app>`. In Ionic Angular, routed page templates should expose `ion-header` / `ion-content` directly and must **not** add an extra inner `<ion-page>` wrapper; the routed component host already serves as the page. The shell-level outlet ownership rule and the page-level no-extra-`ion-page` rule must both hold together.

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

### Codebase Knowledge Graph (graphify-out/)
A pre-generated knowledge graph of the `src/` directory lives at `graphify-out/` (generated 2026-04-08, 951 nodes, 1347 edges, 78 communities). Use it for deep codebase exploration:
- `graphify-out/graph.html` — interactive visual graph (open in browser)
- `graphify-out/graph.json` — machine-readable node/edge data
- `graphify-out/GRAPH_REPORT.md` — god nodes, surprising connections, community summary
- `graphify-out/obsidian/` — Obsidian-compatible markdown vault

**When to use:** Before large refactors, when tracing unfamiliar cross-component dependencies, or when you need to understand which services are most central. The graph is a snapshot — verify with live code before acting on it.

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
npx ionic build           # Ionic build (production config)
npx cap sync             # Sync to native projects (Android for now) 
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

**Document Version:** 1.17.31 | **Maintainer:** AI Assistant

**Changelog:**
- **v1.17.31** (2026-04-19): **Server-triggered FCM delivery hardening for Android native tokens.** `src/app/services/messaging.service.ts` now registers tokens with explicit `platform` and `appId` metadata, with Android tagging the active Capacitor package `com.example.cross_platform_assignment`. `src/app/services/user.service.ts` now models `fcmTokens` as tagged records instead of plain strings. In the sibling API repo, `..\Vercel-Express-API\API\Routes\Messaging.ts` now stores tagged token records, skips legacy plain-string entries during sends, sanitises FCM `data` payloads into string-only fields, logs per-token delivery failures, broadens stale-token cleanup to additional terminal FCM error codes, and exposes `GET /API/Messaging/diagnostics` so the authenticated user can confirm which native/web tokens are actually registered. `..\Vercel-Express-API\API\Routes\Users.ts` now creates profiles with merge semantics so first-run profile creation cannot overwrite a freshly registered token. `..\Vercel-Express-API\API.md` was updated to document the new messaging contract. Verification in this workspace was limited to build-time checks; end-to-end on-device delivery still needs a live Android test after deploying the sibling API changes.
- **v1.17.29** (2026-04-17): **Account-type modal polish, persisted chat hydration, scanner theme override, and Android FCM channel alignment.** `src/app/app.component.ts` now applies authenticated profile language/theme preferences whenever `currentProfile$` refreshes, so restored sessions and existing-user logins immediately pick up saved `preferences.language` and `preferences.theme`. `src/style/global.scss` and `src/app/shared/account-type-selector/account-type-selector.component.html/scss` now convert the mandatory account-type flow from a full-screen sheet into a centred blocking modal, reuse shared light/dim green selection tokens, and let the confirm button inherit the existing primary gradient styling. `src/app/services/theme.service.ts` now separates saved theme state from temporary overrides, and `src/app/shared/qr-scanner/qr-scanner-modal.component.ts` now forces light mode only whilst a live camera session is actually running, then always clears that override during dismiss, cleanup, and failure paths. `src/app/shared/chat-button/chat-button.component.ts` and `src/app/pages/chat/chat.page.ts` now stop relying on socket `message-history` timing for room entry: opening or switching rooms explicitly fetches `GET /API/Chat/Rooms/:roomId/Messages`, resets room-local state, merges live socket traffic by `messageId`, and exposes an explicit `openChatWindow()` path so selecting another room no longer toggles the chat closed. `src/app/services/messaging.service.ts`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/{strings,colors}.xml`, and the new `android/app/src/main/res/drawable/ic_stat_pourrice_notification.xml` now create and advertise a stable Android notification channel (`pourrice_default_notifications`) with default icon/colour metadata plus clearer permission/token/receipt diagnostics. The sibling API file `..\Vercel-Express-API\API\Routes\Messaging.ts` now adds high-priority Android FCM config and the matching channel/icon metadata to booking and chat notifications. Verified with `npx ng build`; no separate sibling-repo build was run from this workspace snapshot.
- **v1.17.27** (2026-04-16): **Auth UX, QR scanner layering, Stripe native checkout, and mandatory account-type onboarding hardening.** `src/app/pages/login/login.page.ts/html` now adds a password visibility toggle for both login and register flows, using `eye-off-outline` as the default masked state and `eye-outline` for visible text mode. `src/app/shared/qr-scanner/qr-scanner-modal.component.scss` mildly enlarges the scanner viewfinder square (260 → 290) and `src/style/global.scss` now forces the QR scanner modal backdrop/content layers transparent during `barcode-scanner-active` mode so dark theme surfaces no longer cover the live native camera feed. `src/app/pages/store/store.page.ts` now uses `@capacitor/browser` on native platforms to open Stripe Checkout in Chrome Custom Tabs / SFSafariViewController and switches Stripe success/cancel URLs to `pourrice://store...` deep links on native. `src/app/app.component.ts` now handles `pourrice://store` deep links with query sanitisation (`payment_success` + `session_id` only), closes the custom tab from the deep-link handler, makes account-type setup modal presentation more deterministic with combined appState/profile observation, enforces full-screen non-dismissable modal presentation (`breakpoints: [1]`), and keeps users on `/user` until type setup is completed; `src/style/global.scss` adds `account-type-modal` full-screen blocking modal styles. Session maintenance also condensed `AGENTS.md` and added a concise `AGENT.md` pointer to direct agents to `CLAUDE.md`.
- **v1.17.26** (2026-04-16): **Notification pipeline repair across web, Android, API, and socket layers.** Frontend: installed `@capacitor-firebase/messaging`, added `FirebaseMessaging` config to `capacitor.config.ts`, added Android `POST_NOTIFICATIONS`, and synced Capacitor Android so native FCM is now registered in the platform project. `src/app/services/messaging.service.ts` was rewritten into a platform-aware transport that supports web and native token retrieval, permission checks, native notification taps, route-first payload handling (`data.route`) with legacy `pourrice://...` fallback parsing, and query-parameter token removal. Added `src/app/services/notification-coordinator.service.ts` to make token registration auth-driven, reconnect sockets app-wide after auth restore, refresh persistent chat-room subscriptions from `/API/Chat/Records/:uid`, emit one in-app notification stream for both FCM and Socket.IO, and de-duplicate chat toasts by `messageId`. `app.component.ts` now starts the coordinator, routes native notification actions, and no longer relies on `auth.currentUser` during the startup permission flow. `auth.service.ts` now removes the backend token on logout before signing out. `restaurant.page.html` now passes `restaurant.ownerId` into `app-chat-button`. `chat.service.ts` now maintains persistent and transient room memberships separately so closing the chat widget no longer drops the socket subscription needed for future notifications. `chat-button.component.ts` now upserts the restaurant chat room with both participants before opening, then tracks that room persistently so reply notifications continue after leaving the page. `firebase-messaging-sw.js` now opens `data.route` first and only falls back to legacy deep links. Backend: `Vercel-Express-API/API/Routes/Messaging.ts` now writes tokens with `set(..., { merge: true })`, accepts token removal through query or body during rollout, and sends route-first booking/chat payloads; chat payloads now include `messageId`. `API/Routes/Chats.ts` now upserts existing rooms by merging participants instead of hard-failing, de-duplicates participant updates, and forwards `messageId` into push notifications. `API.md` updated for the new notification and room contracts. Socket server: `Railway-Socket/src/index.ts` now resolves restaurant owners for `restaurant-*` rooms, ensures they are included in room participants, and auto-joins any connected participants to the room so the first diner message can reach the owner immediately. Verified with `npx ng build --configuration development`, `npx cap sync android`, and syntax-level TypeScript transpilation checks on the changed API/socket files. Full `tsc` builds were not possible in the sibling repos because they do not both have local TypeScript toolchains installed in this workspace snapshot.
- **v1.17.25** (2026-04-15): **Chat participant avatars now use Firebase profile photos with a fixed placeholder fallback.** `src/app/shared/chat-button/chat-button.component.ts/html/scss` now resolves non-self message avatars by `userId`, caches the returned `photoURL` values, renders them beside incoming chat bubbles without changing the existing Ionic layout or colour treatment, and falls back to `https://www.vhv.rs/dpng/d/505-5058560_person-placeholder-image-free-hd-png-download.png` whenever a participant photo is null, sanitised out, or fails to load in the browser. `src/app/services/user.service.ts` gained `getPublicUserProfile()` plus a shared profile-mapping helper so chat can read other users' public profile data without overwriting the logged-in user's `currentProfileSubject` or the localStorage-backed active-profile cache. Verified with `npx ng build`.
- **v1.17.24** (2026-04-15): **Chat image delivery contract fix: broadcast first, persist the same message second.** `Railway-Socket/src/index.ts` now emits `new-message` immediately with both `message` and `imageUrl`, then persists the exact same payload to the REST API using a stable socket-generated `messageId` so live delivery and Firestore history stay aligned instead of forking into duplicate IDs. `Vercel-Express-API/API/Routes/Chats.ts` now accepts optional `messageId`, accepts image-only messages (`message` or `imageUrl` required), stores `imageUrl` on the Firestore message document, treats repeated `messageId` writes idempotently (`200 OK` if already saved), and stores `[Image]` as the room preview when there is no text body. `Vercel-Express-API/API.md` was updated to document the revised chat message contract and the `imageUrl` field in message-history responses. Frontend chat sending in `src/app/shared/chat-button/chat-button.component.ts` no longer abuses the text field by copying the Firebase download URL into `message` for image-only sends; it now sends text and `imageUrl` as separate fields and includes a compatibility fallback so older Firestore records that only stored the download URL in `message` still render as images. `src/app/pages/chat/chat.page.ts/html` now normalise room preview text so raw Firebase Storage URLs appear as `[Image]` / `[圖片]` instead of leaking long download links into the chat list. Verified with `npx ng build`; backend repos did not have local `node_modules`, so syntax-level TypeScript transpilation checks were run against the changed API and socket files instead of a full repo `tsc` pass.
- **v1.17.12** (2026-04-15): **APK blank pages — definitive fix: Ionic-native shell refactor.** Root cause: the shell used a plain Angular `<router-outlet>` inside a `<div>` wrapper, and no routed page had an `<ion-page>` wrapper. Ionic's `StackController.getIonPageElement()` queries for `.ion-page` descendants to toggle `ion-page-hidden`/`ion-page-invisible`; with no `.ion-page` present the entering component stays permanently invisible. Previous attempts (v1.17.8–v1.17.11) tried workarounds (disabling animations, `delay(0)` guards, ViewEncapsulation moves) — all treated symptoms rather than the structural mismatch. **Fix (three batches):** **(Batch A)** Every routed page wrapped in `<ion-page>` with `<app-shared-header>` placed before `<ion-content>` (9 files). `<ion-content class="has-tab-bar">` applied to all pages except login (Batch C). **(Batch B — atomic shell swap)** `app.component.html`: `<router-outlet>` → `<ion-router-outlet id="main-content">` as direct child of `<ion-app>`; custom `<div id="menu-content">` shell removed; `<app-shared-header>` removed from shell (now per-page); `ion-menu contentId` changed to `"main-content"`, `type` to `"overlay"`. `app.component.ts`: removed `@ViewChild(HeaderComponent)`, replaced `this.header.emitPageTitle()` with `window.dispatchEvent(new CustomEvent('page-title', ...))` — every per-page `HeaderComponent` instance already listens on `window` for this event. `app.component.scss`: emptied (no shell layout rules needed). `global.scss`: removed `router-outlet + *` sizing rule; added `ion-content.has-tab-bar { --padding-bottom: calc(56px + env(safe-area-inset-bottom)) }`. `app-routing.module.ts`: removed `LayoutGuard` import and all `canActivate: [LayoutGuard]` entries. `guard.service.ts`: deleted `LayoutGuard` class, pruned unused `delay`/`of` imports. 5 page modules (`home`, `search`, `user`, `booking`, `login`) gained `SharedModule` import so `<app-shared-header>` resolves. **New rule 11:** Never use plain `<router-outlet>` in an Ionic app — `<ion-router-outlet>` must be a direct child of `<ion-app>` and every routed page must start with `<ion-page>`. Supersedes the v1.17.10/v1.17.11 guidance to use `<router-outlet>`. **Files modified:** `app.component.html`, `app.component.ts`, `app.component.scss`, `global.scss`, `app-routing.module.ts`, `guard.service.ts`, `home/search/restaurant/user/booking/store/login/chat .page.html`, `restaurant-info-modal.component.html`, `home/search/user/booking/login .module.ts`, `CLAUDE.md`.
- **v1.17.11** (2026-04-14): **APK blank pages — complete fix: `<router-outlet>` + global CSS + LayoutGuard.** Three compounding issues. **(1) ViewEncapsulation:** v1.17.10 placed `router-outlet + *` CSS in `app.component.scss`, but Angular's `ViewEncapsulation.Emulated` scoped it with `[_ngcontent-XXX]` attributes that dynamically inserted route components don't carry. Moved to `global.scss`. **(2) overflow: hidden:** The `overflow: hidden` on `router-outlet + *` prevented Android WebView from repainting the compositing layer when components were swapped. Removed. **(3) Sync vs async route activation:** Routes with `AuthGuard` worked on APK while unguarded routes didn't. `AuthGuard` returns an Observable pipeline (`filter` → `switchMap` → `map`) which forces Angular's router to process activation asynchronously. Unguarded routes activate synchronously — on Android WebView, synchronous component insertion doesn't trigger a repaint of the rendering pipeline. Created `LayoutGuard` (`of(true).pipe(delay(0))`) and added it to all public routes (`/home`, `/search`, `/restaurant/:id`, `/login`). The `delay(0)` schedules emission in a macrotask, giving the WebView time to process layout changes. **Files modified:** `app.component.html`, `app.component.scss`, `global.scss`, `guard.service.ts`, `app-routing.module.ts`, `CLAUDE.md`.
- **v1.17.10** (2026-04-14): **APK blank pages — partial fix attempt via `<router-outlet>` (incomplete).** Root cause confirmed: `StackController.transition()` unconditionally calls `containerEl.commit()` on Android WebView regardless of `animated` setting; the Promise hangs when `<ion-router-outlet>` is nested in a `<div>` shell; `ion-page-invisible` never removed. Switched `<ion-router-outlet>` to `<router-outlet>` in template and reverted `IonicModule.forRoot({ animated: false })` to `IonicModule.forRoot()`. **However:** `app.component.scss` was not updated (still targeted `ion-router-outlet`), so all pages went blank. `app.component.html` was reverted. Fix completed in v1.17.11. Root cause confirmed from Ionic 8 source (`ionic-angular-common.mjs`): `StackController.transition()` unconditionally calls `containerEl.commit()` on the `ion-router-outlet` Stencil web component regardless of `animated` setting. `animated: false` only sets `duration: 0` inside `commit()` — it does NOT prevent `commit()` from being called. On Android WebView, `commit()` hangs when `ion-router-outlet` is nested inside a `<div>` shell. Since `ion-page-invisible` removal only runs after `commit()` resolves, entering pages stay permanently transparent. v1.17.8 (`[animated]="false"`) and v1.17.9 (`IonicModule.forRoot({ animated: false })`) both failed because they targeted the animation duration, not the `commit()` call itself. **Fix:** Replace `<ion-router-outlet>` with standard Angular `<router-outlet>` in `app.component.html`. Angular's router outlet creates/destroys components directly without `StackController`, `wait()`, `commit()`, or any `ion-page-hidden`/`ion-page-invisible` management. Pages are immediately visible on activation. `app.component.scss` updated: `ion-router-outlet` styles replaced with `router-outlet + *` (targets the dynamically inserted page component sibling). `IonicModule.forRoot({ animated: false })` reverted to `IonicModule.forRoot()` — restores natural overlay animations for modals/alerts/toasts (previously only disabled to work around routing; CSS `transition: all` bug was already fixed in v1.14.0). `ionViewWillEnter()` removed from `store.page.ts` (with standard router-outlet, `/store/edit-info` is a sibling route — navigating back to `/store` destroys and recreates `StorePage`, so `ngOnInit()` handles data reload automatically). `ionViewDidLeave()` removed from `user.page.ts` (component destruction resets instance state). **New rule:** Never use `<ion-router-outlet>` when the outlet is not a direct child of `<ion-app>`. In a custom div shell, always use `<router-outlet>`. **Files modified:** `app.component.html`, `app.component.scss`, `app.module.ts`, `store.page.ts`, `user.page.ts`, `CLAUDE.md`.
- **v1.17.9** (2026-04-14): **Superseded APK blank-page investigation.** This session incorrectly attributed the remaining native blank pages to Ionic animation config (`IonicModule.forRoot({ animated: false })`). Keep it only as history; the accurate combined shell + `RestaurantsService` root cause is documented in the dedicated **Android Blank Page Bug Fix (v1.17.12)** section below.
- **v1.17.8** (2026-04-13): **Superseded APK blank-page investigation.** This session incorrectly treated `[animated]="false"` on `<ion-router-outlet>` as the root-cause fix. It was not the durable fix. Keep it only as history; use the v1.17.12 explanation instead.
- **v1.17.7** (2026-04-13): **Android blank page fix (structural) — dual router outlet + ion-content shell + cold-start layout + content margin.** Four compounding issues. **(1) `<ion-tabs>` auto-injects `<ion-router-outlet tabs="true">`** at runtime, creating two competing primary outlets; navigation was intercepted by the tabs outlet and rendered inside a 50 px-tall `.tabs-inner` (invisible). Fixed by removing `<ion-tabs>` from `tab.component.html`; standalone `<ion-tab-bar>` with `routerLink` creates no secondary outlet. **(2) `<ion-content>` as app shell wrapper** prevented `flex: 1` from taking effect on `<ion-router-outlet>` (shadow DOM scroll container ignores flex children). Fixed by replacing with `<div id="menu-content" class="app-content">` and adding flex layout. **(3) `height: 100%` failed during cold start** for unauthenticated routes (Home, Search) — `<ion-app>` has `contain: layout size style`; percentage height cannot resolve across this containment boundary in the first paint tick on Android WebView. Auth-guarded pages happened to work because the ~300–800ms Firebase auth init delay gave the layout time to settle. Fixed by changing `.app-content` to `position: absolute; inset: 0` in `app.component.scss` — resolves immediately via layout constraints. **(4) Content rendered too high on mobile** — `ion-content::part(scroll) { padding-top: 16px }` left content flush against the header. Increased to `1.5rem` in `global.scss`. **Files modified:** `app.component.html`, `app.component.scss`, `tab.component.html`, `tab.component.scss`, `global.scss`. Backup: `app.component.html.bak`.
- **v1.17.6** (2026-04-12): Android blank page fix. Removed `*ngIf="{ mobile: (isMobile$ | async) }"` content gates from all page templates. Removed localStorage platform persistence. Made CSS mobile-first. All pages now render correctly on Android WebView (API 36+).
- **v1.17.5** (2026-04-12): **Android native Google Sign-In + web One Tap `origin_mismatch` fix.** **(1) Android:** Replaced `signInWithRedirect()` (which caused `disallowed_useragent` in Capacitor WebView) with `@capgo/capacitor-social-login` native SDK. `SocialLogin.login()` shows the system account picker sheet — no browser involved. `SocialLogin.initialize()` called in `AppComponent.ngOnInit()`. Returns `idToken` passed to `signInWithCredential()`. `handleRedirectResult()` removed. `com.example.app://callback` intent filter removed. `accounts.google.com` removed from `capacitor.config.ts` `allowNavigation`. **(2) Web One Tap:** Added `use_fedcm_for_prompt: true` + `itp_support: true` to GSI config — FedCM (Chrome 108+) replaces the old iframe flow and avoids the JavaScript-origin check that caused `origin_mismatch`. Added `prompt(notification => ...)` callback so suppressed prompts log silently instead of opening an error page. TypeScript `google.accounts.id` declaration extended with `use_fedcm_for_prompt`, `itp_support`, `getNotDisplayedReason()`, `getMomentType()`. **Files modified:** `auth.service.ts`, `app.component.ts`, `capacitor.config.ts`, `AndroidManifest.xml`, `login.page.ts`, `package.json`.
- **v1.17.4** (2026-04-11): **Android rendering, menu overlap, and OAuth redirect fixes.** First physical Android device test (Samsung S24U, Android 16) revealed three critical issues. **(1) Blank pages fix:** 6 page templates (`home`, `search`, `restaurant`, `store`, `booking`, `user`) wrapped all content in `*ngIf="isMobile$ | async as isMobile"` — when observable emitted `false`, Angular removed the entire DOM. Fixed by replacing with always-truthy object wrapper: `*ngIf="{ mobile: (isMobile$ | async) ?? false } as platform"` and updating all `isMobile` refs to `platform.mobile`. Login/Chat pages were unaffected (never used this pattern). **(2) App shell layout fix:** Reverted `<div class="app-shell">` (from PR #51) back to `<div class="ion-page">` — the custom shell with `overflow: hidden`, `position: absolute` on router-outlet, and `position: fixed` on header broke Ionic's layout on Android WebView. Changed menu `type="push"` to `type="overlay"`. Removed all z-index hacks (1500/2500/1000) from `app.component.scss`. **(3) Google Sign-in fix:** `signInWithPopup()` opens system browser on Android, which can't redirect back. `auth.service.ts` now uses `signInWithRedirect()` on native platforms (detected via `Capacitor.isNativePlatform()`), popup on web. Added deep link intent filter for `com.example.app` and `pourrice` schemes in `AndroidManifest.xml`. `capacitor.config.ts` configured with `androidScheme: 'https'` and `allowNavigation` narrowed to specific Firebase authDomain and Google accounts. `app.component.ts` gains `setupDeepLinkListener()` using `@capacitor/app` `appUrlOpen` event for deep link routing (`pourrice://menu/{id}` → `/restaurant/{id}`, `pourrice://bookings`, `pourrice://chat/{roomId}`, and OAuth callbacks). **(4) Capacitor v8 alignment:** `@capacitor/android` and `@capacitor/ios` upgraded from v7 to `8.3.0` (exact pin) to match `@capacitor/core` 8.3.0. Added `@capacitor/browser` `8.0.0`. **(5) PlatformService hardened:** `BehaviorSubject` now seeds with `earlyMobileCheck()` (Capacitor native bridge + UA string) before `init()` is called, ensuring mobile-first rendering. **(6) Gradle updated** from 8.11.1 to 8.13.2 for JDK 21 compatibility. **Files modified:** `home.page.html`, `search.page.html`, `restaurant.page.html`, `store.page.html`, `booking.page.html`, `user.page.html`, `app.component.html`, `app.component.scss`, `app.component.ts`, `auth.service.ts`, `platform.service.ts`, `capacitor.config.ts`, `AndroidManifest.xml`, `gradle-wrapper.properties`, `package.json`.
- **v1.17.3** (2026-04-09): **Open/closed badge logic fix + "New" rating badge + map InfoWindow distance fallback.** (1) **`getOpeningStatus` rewritten** in both `home.page.ts` and `search.page.ts`: missing weekday in `Opening_Hours` now returns `'closed'` (not `'unknown'`); multi-period hours (`"11:30-15:00, 17:30-21:30"`) now correctly check all periods via global regex; empty `Opening_Hours` map stays `'unknown'`; default fallback changed from `'unknown'` to `'closed'`. Root cause confirmed via cURL: the test restaurant only defines Mon/Sat/Sun — Wednesday correctly now shows Closed. (2) **"New" rating badge**: when a restaurant has no reviews and no `rating` field, the badge now shows `New` / `全新` instead of being hidden — applied to search list cards, home page Nearby and Trending cards, and the map InfoWindow. (3) **Map InfoWindow distance fallback**: `distanceText` now calls `getDistanceBadge()` when `restaurant.distance` is null (non-Near-Me mode), enabling distance display for regular search results if the user has granted location permission.
- **v1.17.2** (2026-04-09): **Opening/rating badge fixes + trending restaurants from real API.** (1) **Home page Trending section now loads real restaurants from API** sorted by `rating` descending (replaces static mock data); this gives cards access to `Opening_Hours` and `rating` so all badges render correctly. (2) **`rating` field added to Algolia hit mappings** in both `searchRestaurants()` and `searchRestaurantsWithFilters()` in `restaurants.service.ts` — search results now carry `restaurant.rating` directly. (3) **Search page map InfoWindow content built at click time** (moved from marker-creation time) so `ratingMap` is always fresh; `restaurant.rating` used as immediate fallback when `ratingMap` hasn't loaded yet. (4) **Rating badge review count** now uses `*ngIf` guard so `()` is never shown without a count — fixed in `home.page.html` (both Nearby and Trending cards) and `search.page.html`.
- **v1.17.1** (2026-04-06): **Cross-platform feature parity.** (1) **Account type selector**: `UserTypeSelectionComponent` shown as a non-dismissable bottom sheet to new users (post-registration). Calls `PUT /API/Users/:uid { type }` on selection; `UserService` exposes `needsAccountTypeSelection$` observable; sheet auto-dismisses on success. (2) **Opening status badges on Home page cards**: Nearby and Trending restaurant cards now show green `Open` / red `Closed` pill overlaid on the card thumbnail. Badge computed from `Restaurant.Opening_Hours` using `Intl.DateTimeFormat` with `Asia/Hong_Kong` timezone — same `getOpeningStatus()` helper as search cards. (3) **Review image upload**: `ReviewsService` gains `uploadReviewImage(file: File, token: string): Observable<string>` calling `POST /API/Images/upload?folder=Reviews` (multipart). `RestaurantPage` review submission form includes file input with preview; selected image is uploaded before `createReview()` is called; `imageUrl` included in the review payload.
- **v1.17.0** (2026-04-02): **QR code feature — generator + scanner.** Deep-link format `pourrice://menu/{restaurantId}` (identical to iOS/Android). **Generator**: `MenuQrModalComponent` (`store/menu-qr-modal/`) uses `qrcode` npm package (canvas, error correction H, 200 px display / 600 px download PNG). Opened via "Menu QR Code" button in Store → Menu tab action bar. Features: display, full-screen expand, download PNG. **Scanner**: `QrScannerModalComponent` (`shared/qr-scanner/`) accessible from nav drawer (all users, no login). Native: `@capacitor-mlkit/barcode-scanning` v8 `startScan()` with `.barcode-scanner-active` transparent-WebView pattern + torch toggle. Web: `getUserMedia` + `BarcodeDetector` API (Chrome/Edge 83+) polling every 400 ms; falls back to informational message if API unavailable. Validates URL scheme, fetches restaurant via `RestaurantsService`, navigates to `/restaurant/:id`. Global CSS was originally added to `src/global.scss`; this was later corrected in v1.17.12 when it was discovered the compiled global stylesheet is `src/style/global.scss`. `QrScannerModalComponent` declared in `SharedModule`; `MenuQrModalComponent` declared in `StorePageModule`.
- **v1.16.0** (2026-03-30): **Add New Restaurant modal.** `AddRestaurantModalComponent` (`store/add-restaurant-modal/`) lets Restaurant-type users who can't find their restaurant in the claim search create a new listing. **API flow** (no `/claim` call): `POST /API/Restaurants` with `ownerId: uid` in body (no auth, uses existing `RestaurantsService.createRestaurant()`) → `PUT /API/Users/:uid { restaurantId }` (auth auto-attached by UserService). **Form**: bilingual names (EN/TC, at least one required), address (EN/TC), district (radio AlertDialog), seats, contacts (phone/email/website), Google Maps location pin (tap to place, same `initializeMap()`/`onMapClick()` pattern as `restaurant-info-modal`), opening hours (text-input AlertDialog per weekday, `"HH:MM-HH:MM"` format), keywords (checkbox AlertDialog, shown in active language), payments (checkbox AlertDialog, shown in active language, stores EN strings). **Trigger**: "Add New Restaurant" `ion-button` in the empty-state block of `store.page.html`. `StorePage.openAddRestaurantModal()` re-calls `loadRestaurantData()` on `{ created: true }`. `StorePageModule` declares the new component. CSS: all transitions scoped to `transform, box-shadow` — no `transition: all`.
- **v1.15.3** (2026-03-25): **API batch-stats fix + unified restaurant card redesign.** (1) Fixed critical `GET /API/Reviews/batch-stats` returning `{"error":"Review not found"}` — root cause: route was defined after `/:id`, so Express matched `batch-stats` as an ID. Fixed by moving the `/batch-stats` route before `/:id` in `Reviews.ts`. (2) Search page list card redesign: **distance badge** (blue pill, top-right of thumbnail, Near Me only), **rating badge** (gold text on dark pill, bottom-right of thumbnail), **opening status badge** (bottom-left, unchanged). Info section now shows: name → keywords row (2 tags + overflow count, above district) → district → address (replacing the old distance row). (3) Home page restaurant cards (Nearby + Trending) updated to match: rating badge on thumbnail bottom-right, keywords row in card-content, `&::part(native) { padding: 0; }` for edge-to-edge thumbnails. `HomePage` gains `ratingMap`, `formatRatingStars()`, `getDisplayKeywords()`, `getKeywordCount()`, and batch stats loading for both nearby and trending restaurants. (4) Fixed `transition: all` → `transition: transform, box-shadow` on home page cards and review card.
- **v1.15.2** (2026-03-21): **Search card star ratings, thumbnail fix, Near Me icon fix.** (1) Near Me chip icon now uses explicit `*ngIf` switch between `locate` (filled, when active/loading) and `locate-outline` (default), fixing Ionicons dynamic `[name]` binding issue. (2) Restaurant card thumbnails now fill edge-to-edge: added `&::part(native) { padding: 0; }` to remove Ionic `ion-card` default inner padding. (3) Added star ratings to search result cards and map InfoWindows. New backend endpoint `GET /API/Reviews/batch-stats?restaurantIds=id1,id2,...` (max 50 IDs) returns `{ [restaurantId]: { totalReviews, averageRating } }` using Firestore `in` queries (chunked at 30). Frontend: `ReviewsService.getBatchStats()` method, `SearchPage.ratingMap` populated after each search/nearby call, rating row shows `★★★★☆ (12)` with gold star colour. (4) Updated `ReviewsService` exports with `getBatchStats()` method.
- **v1.15.1** (2026-03-21): **Search page UX + map modal alignment + claim restaurant gate.** (1) Near Me chip now shows filled `locate` icon immediately when clicked (during loading state). (2) Search result cards restructured to 50/50 layout: thumbnail (16:9 `aspect-ratio`) on top with opening-status badge (`Open`/`Closed` overlaid bottom-left) and compact info below (name, district, distance). Opening status computed from `Opening_Hours` using `Intl.DateTimeFormat` with `Asia/Hong_Kong` timezone. `getOpeningStatus()` helper added to `SearchPage`. (3) Map InfoWindow redesigned: whole card is an `<a>` tag linking to `/restaurant/:id` (replaces separate "View Details" link), includes thumbnail, name, district, distance + opening badge. (4) Map modal alignment fixed by removing the mobile `@media (max-width: 768px)` CSS rule that applied `margin: 10vh auto` and `height: 80vh`, causing the map to float inside the modal. Map container now fills 100% of `ion-content` on all screen sizes. (5) Claim/edit restaurant restricted to Restaurant-type users without a `restaurantId`: `canEditRestaurant` is now set inside `checkClaimEligibility`'s async profile callback (same conditions as `canClaimRestaurant`). `checkEditPermission()` defaults to `false` and lets the async check override it. Diner users and already-claimed restaurant owners no longer see the "Edit Restaurant Image" card on unclaimed restaurant pages.
- **v1.15.0** (2026-03-21): **Enhanced Google Maps features — map view on search page, Near Me proximity search, and directions.** Added `getNearbyRestaurants()` to `RestaurantsService` calling backend `GET /API/Restaurants/nearby` (Haversine, 5km default radius). Search page: list/map view toggle via `ion-segment`, map shows markers for all search results with InfoWindow (name, district, image, "View Details" link). "Near Me" chip requests GPS, fetches nearby restaurants, shows distance badges on cards and radius circle on map. Restaurant page: "Get Directions" button opens fullscreen `MapModalComponent` with directions. `MapModalComponent` enhanced: `DirectionsService`/`DirectionsRenderer` integration, travel mode segment (Transit/Walking/Driving/Cycling, default Transit for HK), route info bar (duration + distance), error handling with "Open in Google Maps" fallback. All new UI text bilingual (EN/TC). Fixed 2 `transition: all` rules in `search.page.scss` → scoped to `transform, box-shadow`.
- **v1.14.0** (2026-03-19): **Store page modal freeze fix + RestaurantInfoModal converted to sub-page.** Root cause: `transition: all 0.3s ease` on `ion-card` in `global.scss` flooded zone.js with `transitionend` events during Ionic modal animations (same class of bug as the `*` selector fix in v1.0). Fixed by scoping transitions to only the properties used in hover effects (`transform`, `box-shadow`). Also fixed 3 additional `transition: all` rules in `store.page.scss`. `RestaurantInfoModalComponent` (519 lines TS, 7 cards, Google Maps, image upload) converted from modal to routed sub-page at `/store/edit-info` — uses `ionViewWillEnter` on StorePage to reload data on return. Remaining store modals (AdModal, MenuItemModal, BulkMenuImportModal) keep modal pattern; CSS fix resolves freeze for them.
- **v1.13.0** (2026-03-05): **Booking modal with opening hours awareness.** Replaced inline booking form with `BookingModalComponent` modal (triggered by Reserve button). Modal features: inline `ion-datetime` (24h HK timezone), live opening hours status badge (green/amber/grey), guest stepper (1-10), special requests textarea, confirmation footer button. Opens after login check; shows warning toast if booking outside hours (non-blocking). Uses `Intl.DateTimeFormat` with `Asia/Hong_Kong` timezone to reliably extract HK weekday/time from any ISO datetime. Opening hours parsing supports both string (`"11:30-21:30"`) and object (`{open,close}`) formats with dash variants (`-`, `–`, `~`). UX: tap Reserve → login if needed → pick date/time/guests → confirm → toast feedback. Bilingual (EN/TC) throughout.
- **v1.12.0** (2026-03-04): **Booking system overhaul — payment logic removed, accept/decline workflow added.** Status values changed from `pending/confirmed/cancelled` to `pending/accepted/declined/cancelled/completed`. `paymentStatus`/`paymentIntentId` removed from all booking operations. New `declineMessage` field (set by restaurant owner on decline). Added `GET /restaurant/:restaurantId` endpoint (owner-only, enriches each booking with diner displayName/email/phoneNumber). `PUT /:id` now supports dual-ownership: diners can edit/cancel pending bookings; restaurant owners can accept/decline/complete. `DELETE /:id` enforces 30-day rule. Diner booking page: added edit/delete actions, declined status tab, decline message display. Store page: added status filter tabs (Pending/Accepted/Declined/Cancelled/All), diner info per card, Accept/Decline buttons with optional decline message, chat button.
- **v1.11.1** (2026-03-04): **Critical auth guard race condition fix.** Fixed spurious redirects to `/login` when refreshing or re-entering protected pages while logged in. **Root cause:** `AuthGuard.canActivate()` used `take(1)` on a BehaviorSubject initialized with `null`, firing before Firebase's `onAuthStateChanged` could restore the persisted session (~300-800ms delay). **Fixes:** (1) Added `authInitialized$` observable to `AuthService` that emits `true` only after the first `onAuthStateChanged` callback. (2) Guard now waits for `authInitialized$` before checking auth state. (3) Guard passes `returnUrl` query param when redirecting, preserving deep links (esp. Stripe's `?payment_success=true&session_id=...`). (4) LoginPage now reads `returnUrl` and navigates there post-auth instead of always `/user`. (5) Added localStorage failsafe in StorePage: saves pending ad sessions to localStorage, allowing users to resume ad creation if modal is accidentally closed after Stripe payment. **Result:** Stripe payment flow now works reliably; all deep links preserved through auth redirects.
- **v1.11.0** (2026-03-04): Advertisement placement system with Stripe payment integration. Added `advertisements.service.ts` for Firestore CRUD. Implemented `AdModalComponent` for bilingual ad creation (EN/TC) with image uploads. Added `/API/Advertisements` CRUD endpoints and `POST /API/Stripe/create-ad-checkout-session` for HK$10 payments. Updated StorePage with ad management UI and payment flow. Overhauled HomePage to fetch and display real Firestore ads alongside mock offers with bilingual support. Introduced language fallback pattern for bilingual fields. Updated from 23 to 24 core services.
- **v1.13.0** (2026-04-09): **FCM backend token registration.** `MessagingService` now registers device tokens with the API (`POST /API/Messaging/register-token`) after permission is granted, and removes them on `deleteCurrentToken()`. `subscribeToTopic()` and `unsubscribeFromTopic()` are fully implemented (previously no-op stubs) — signatures updated to accept `authToken` as a third parameter. `app.component.ts` calls `registerTokenWithBackend()` in both the auto-grant and "Allow" button paths, obtaining a fresh ID token via `getIdToken()` from `@angular/fire/auth`. `DataService.deleteWithBody()` added for DELETE requests with a body. `fcmTokens?: string[]` added to `UserProfile` interface in `user.service.ts`. Notification deeplinks: `pourrice://bookings` (booking status) and `pourrice://chat/{roomId}` (chat message) are sent by the server in FCM `data.url`.
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

---

## Android Blank Page Bug Fix (v1.17.12)

### Accurate Root Cause

Follow-up APK validation confirmed the durable root cause was the shared `RestaurantsService` runtime path, not the temporary shell/UI refactor:

1. `RestaurantsService` still performed dead eager direct Algolia initialization even though the app already searches through the backend API.
2. The pages that stayed blank on APK all injected `RestaurantsService` directly or indirectly: Home, Search, Store, and QR scanner validation.
3. The temporary `/test/*` routes rendered because they did not inject `RestaurantsService`, which isolated the failure away from the router itself.
4. QR scanner visibility rules also had to live in compiled `src/style/global.scss`, not dead `src/global.scss`.

### Fix Applied

1. `RestaurantsService` no longer imports or eagerly initializes the direct Algolia browser client. `searchRestaurants()` now delegates to the backend search path instead of constructing an unused client-side Algolia instance.
2. The active QR-scanner visibility rules were moved into `src/style/global.scss`, and `src/global.scss` was explicitly deprecated so future global fixes are not written into a dead file.
3. The temporary shell/header/tab/test-page refactor was used only to isolate the issue. After APK confirmation that `RestaurantsService` was the real root cause, the UI was rolled back to the prior global-header / `ion-tab-bar` presentation and the temporary `/test/*` routes were removed.

### Files Changed

| File | Change |
|------|--------|
| `src/app/services/restaurants.service.ts` | Removed dead eager direct Algolia client initialization and routed search through the backend API only |
| `src/style/global.scss` | Became the active home for QR-scanner visibility rules |
| `src/global.scss` | Deprecated explicitly so future fixes do not land in a non-built stylesheet |
| `src/app/shared/qr-scanner/qr-scanner-modal.component.ts` | Comment updated to point to the real compiled global stylesheet |
| `src/app/app.component.html`, `src/app/shared/tab/*`, routed page templates | Temporary UI rollback restored the prior global-header / `ion-tab-bar` shell after the rendering root cause was confirmed |
| `src/app/pages/test/*`, `src/app/app-routing.module.ts`, `src/app/shared/menu/menu.component.html` | Temporary APK diagnostics routes and menu entries were removed after confirmation |

### Rules Going Forward

1. Do not reintroduce direct eager Algolia client setup into `RestaurantsService` unless the native build is explicitly revalidated.
2. Treat `src/style/global.scss` as the only active global stylesheet for QR scanner and other app-wide runtime rules.
3. If APK-only rendering bugs return, isolate shared injected services before rewriting the app shell again.
4. Temporary diagnostic routes should be removed once the suspected runtime path is confirmed.

- **v1.17.13** (2026-04-15): **Android launcher icon refresh + bundled placeholder fallback.** (1) Replaced the Android launcher raster assets in `android/app/src/main/res/mipmap-*` with new variants generated from `src/assets/icon/App-Dark.png`, keeping white-backed legacy icons and transparent adaptive foreground layers. (2) Standardised `placeholderImageUrl` in both `src/environments/environment.ts` and `src/environments/environment.prod.ts` to the bundled `assets/icon/Placeholder.png` so APK builds no longer use the remote `placehold.co` “No Image” placeholder. (3) Verified production Angular build with `npx ng build --configuration production` and re-synced assets with `npx cap copy android`. (4) `npm run build` currently misfires because `ionic capacitor build android` attempts a Capacitor init flow that is incompatible with this repo’s `capacitor.config.ts`.
- **v1.17.14** (2026-04-15): **Android camera and location permission fix.** Added `android.permission.CAMERA`, `android.permission.ACCESS_COARSE_LOCATION`, and `android.permission.ACCESS_FINE_LOCATION` to `android/app/src/main/AndroidManifest.xml`. Verified that both merged outputs now contain the permissions via `:app:processDebugManifest` and `:app:processReleaseManifest`, which is required for the APK’s QR scanner camera flow and WebView geolocation prompt flow to work on-device.
- **v1.17.15** (2026-04-15): **Search page sticky filter auto-shrink + compact primary actions.** `src/app/pages/search/search.page.ts/html/scss` now collapses the sticky search/filter block once the user scrolls down, compacting the search bar, filter chips, icons, and view toggle into a `15vh` sticky state. A transparent overlay catches the first tap while collapsed so the whole section expands cleanly before any chip action fires. The three primary actions (Districts, Categories, Near Me) were re-laid out into a dedicated single-row group with capped maximum widths and smaller mobile sizing, while selected tags and the Clear All chip were moved to a secondary row that is hidden in the collapsed state. Verified with `npx ng build`.
- **v1.17.16** (2026-04-15): **Search bar text auto-fit refinement.** `src/app/pages/search/search.page.scss` now sizes the `ion-searchbar` shadow input and search icon with responsive `clamp(...)` rules so the placeholder and typed text shrink automatically on narrower screens instead of clipping inside the sticky search bar. The collapsed sticky state uses an additional smaller responsive font size for the compact header mode. Verified with `npx ng build`.
- **v1.17.17** (2026-04-15): **Search header visual refinement — full-bleed strip with internal shadows.** `src/app/pages/search/search.page.scss` keeps the sticky search/filter area as a full-bleed strip instead of a floating card, but moves the visual depth onto the controls inside it. The search bar, filter chips, and list/map segment now use a shared shadow system; dark mode switches those control shadows to white-glow variants. The search placeholder/input font sizing was tightened further for narrow screens, the expanded layout spacing was rebalanced, and the search-header icons now use the page-title text colour family instead of the previous purple accent. Verified with `npx ng build`.
- **v1.17.18** (2026-04-15): **Search sticky-header selector fix + scroll-direction restore.** `src/app/pages/search/search.page.scss` now targets the real sticky-header markup (`.filter-chips-primary` and `.filter-chips-tags`) instead of the stale `.filter-chips-container` selector, so the three primary filter buttons stay on one line with capped widths, responsive font/icon sizes, stronger visible shadows, and white-glow shadows in dark mode. `src/app/pages/search/search.page.ts` now tracks scroll direction so the compact `15vh` header re-expands on a small upward scroll as well as on tap/focus, and `src/app/pages/search/search.page.html` marks selected primary chips for the compact styling state. Search-bar placeholder and typed text sizing were tightened again to keep the full prompt visible inside the bar. Verified with `npx ng build`; `npm run build` still fails because the script invokes the incompatible Capacitor init flow for this repo.
- **v1.17.19** (2026-04-15): **Search header oscillation fix + title-palette icon colour correction.** `src/app/pages/search/search.page.ts` now uses a small re-collapse buffer plus a downward-scroll delta threshold so the sticky search block does not flicker between collapsed and expanded states immediately after a tap-expand or slight upward scroll. `src/app/pages/search/search.page.html` removes the extra `focusin`-driven expansion hook, leaving the collapsed overlay as the single manual-expand path. `src/app/pages/search/search.page.scss` now colours the sticky-header icons from the same primary/secondary title palette instead of resolving to plain black or white, with a primary-colour fallback for WebViews that do not support `color-mix(...)`. Verified with `npx ng build`.
- **v1.17.20** (2026-04-15): **Search header hysteresis rewrite + wider search input text area.** `src/app/pages/search/search.page.ts` now uses a lock-and-travel state model for the sticky search block: collapse only after a deliberate downward travel past the main threshold, expand after a deliberate upward travel or near-top scroll, and ignore scroll noise during the header-height transition itself. This replaces the earlier per-event delta approach that still allowed layout-shift feedback loops. `src/app/pages/search/search.page.scss` widens the practical search text area by reducing internal container padding/gaps, letting the input fill the available width, and slightly shrinking the placeholder in both expanded and collapsed states. Verified with `npx ng build`.
- **v1.17.21** (2026-04-15): **Restaurant-page native share action in the global header.** Added `@capacitor/share` and synced Capacitor Android plugin registration (`android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`) so the mobile header can open the OS share sheet natively. `src/app/shared/header/header.component.ts/html/scss` now listens for a contextual `page-share` event and renders a `share-social-outline` button immediately to the left of the mobile back button, but only when the active page provides share metadata. `src/app/app.component.ts` clears that contextual share state on every route change, and `src/app/pages/restaurant/restaurant.page.ts` now publishes bilingual share payloads for the current restaurant name/address plus a public Google Maps URL, avoiding useless `capacitor://localhost/...` links in native shares. Verified with `npx ng build` and `npx cap sync android`.
- **v1.17.22** (2026-04-15): **Restaurant share copy aligned with Flutter reference.** `src/app/pages/restaurant/restaurant.page.ts` now uses the same language-specific share text as `C:\Users\Test-Plus\Projects\Android Assignment\lib\pages\restaurant_detail_page.dart`: Traditional Chinese shares now say `我啱啱發現咗呢間好正斗嘅素食餐廳！`, and English shares now say `I found this great vegan restaurant!`, followed by the restaurant name and address.
- **v1.17.23** (2026-04-15): **Shared mobile header title centring + chat overlay layering fix.** `src/app/shared/header/header.component.html/scss` now applies a dedicated mobile toolbar mode that absolutely centres the shared `ion-title` across the viewport instead of letting the start/end slots pull it off-centre; the title keeps equal inline padding so it stays visually centred even when the share and back buttons are visible on the right. `src/app/shared/chat-button/chat-button.component.ts/scss` now uses a two-part fix for the shared restaurant chat UI: the host becomes a full-viewport overlay layer (`position: fixed; inset: 0; pointer-events: none`) and, in `ngAfterViewInit`, the host element is moved from the page-local `ion-content` into the app root (`ion-app`) so the chat FAB and chat room window are no longer trapped inside the routed page stacking context underneath the fixed mobile tab bar. This replaced an earlier `slot="fixed"` attempt that caused the chat UI to disappear. Verified with `npx ng build`; `npm run build` still misfires in this repo because it triggers the incompatible Capacitor init flow.
- **v1.17.29** (2026-04-18): **Stripe return deep-link handling fixed for warm-resume Android flows.** `src/app/pages/store/store.page.ts` no longer uses a one-shot `take(1)` query-param subscription for `payment_success/session_id`. The Store page now listens to query params for the full component lifecycle (`takeUntil(this.destroy$)`), deduplicates callbacks via `lastHandledStripeSessionId`, and re-checks pending sessions in `ionViewWillEnter()` so ad-modal recovery still works when Android returns to an already-mounted Store route instance after Stripe Checkout. This directly addresses the case where `pourrice://store?payment_success=true&session_id=...` arrives after initial page render, which previously left the ad modal unopened.
- **v1.17.30** (2026-04-18): **Stripe ad-return validation tightened to Checkout Session IDs.** `src/app/pages/store/store.page.ts` now validates Stripe return IDs with `isValidStripeCheckoutSessionId()` and only accepts `cs_...` values in both live deep-link query handling and localStorage recovery (`checkPendingAdSession()`). This prevents malformed/irrelevant IDs (for example PaymentIntent-style `pi_...`) from triggering ad-modal flows and keeps the store payment callback aligned with Stripe Checkout’s `{CHECKOUT_SESSION_ID}` return contract.
