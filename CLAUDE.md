# CLAUDE.md - AI Assistant Guide for Cross-Platform-Assignment

> **Last Updated:** 2025-11-30 (Critical Bug Fix & Theme Improvements)
> **Project Version:** 1.5.1
> **Angular Version:** 20.3.3
> **Ionic Version:** 8.7.9
> **API Backend:** Vercel (External Deployment)

## Table of Contents
1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Technology Stack](#technology-stack)
4. [Architecture Patterns](#architecture-patterns)
5. [API Documentation](#api-documentation)
6. [Data Models](#data-models)
7. [Development Workflow](#development-workflow)
8. [Key Services](#key-services)
9. [Routing & Navigation](#routing--navigation)
10. [Security Conventions](#security-conventions)
11. [Styling Conventions](#styling-conventions)
12. [Testing Strategy](#testing-strategy)
13. [Build & Deployment](#build--deployment)
14. [Common Tasks](#common-tasks)
15. [AI Assistant Guidelines](#ai-assistant-guidelines)

---

## Project Overview

**Cross-Platform-Assignment** is a full-stack restaurant discovery and booking application built with Angular/Ionic for the frontend and Node.js/Express for the backend (deployed on Vercel). The application supports:

- **Multi-platform deployment:** Web (PWA), iOS, and Android via Capacitor
- **Bilingual support:** English and Traditional Chinese (EN/TC)
- **Restaurant search:** Powered by Algolia with district and keyword filtering
- **User authentication:** Firebase Auth with Google OAuth
- **Booking management:** Create, view, and manage restaurant reservations
- **Interactive maps:** Leaflet integration for restaurant locations
- **Theming:** Light/dark mode with system preference detection
- **Real-time chat:** Socket.IO integration for restaurant-customer communication
- **AI Assistant:** Google Gemini integration for intelligent assistance

**Key Features:**
- Progressive Web App (PWA) with service worker
- Real-time data sync via Firebase Firestore
- Responsive design with Ionic components and adaptive layouts
- Lazy-loaded routes for optimal performance
- JWT-based API authentication
- Socket.IO real-time chat system
- Google Gemini AI assistant integration
- Adaptive mobile/web layout system with automatic platform detection

---

## Codebase Structure

```
Cross-Platform-Assignment/
├── src/                          # Frontend source code
│   ├── app/
│   │   ├── pages/               # Feature modules (lazy-loaded)
│   │   │   ├── home/           # Home page with featured content
│   │   │   ├── search/         # Restaurant search with Algolia
│   │   │   ├── restaurant/     # Restaurant detail view + map + chat
│   │   │   ├── user/           # User profile (auth-protected)
│   │   │   ├── bookings/       # Booking management page
│   │   │   ├── store/          # Restaurant management (admin)
│   │   │   ├── login/          # Authentication page
│   │   │   └── test/           # Testing/development page
│   │   ├── services/           # Core business logic (17 services)
│   │   │   ├── auth.service.ts           # Firebase authentication
│   │   │   ├── restaurants.service.ts    # Restaurant CRUD
│   │   │   ├── user.service.ts           # User profile management
│   │   │   ├── booking.service.ts        # Booking management
│   │   │   ├── reviews.service.ts        # Review CRUD operations
│   │   │   ├── location.service.ts       # GPS & distance calculations
│   │   │   ├── chat.service.ts           # Socket.IO real-time chat (NEW)
│   │   │   ├── gemini.service.ts         # Google Gemini AI assistant (NEW)
│   │   │   ├── guard.service.ts          # Route protection
│   │   │   ├── theme.service.ts          # Dark/light mode
│   │   │   ├── language.service.ts       # EN/TC switching
│   │   │   ├── platform.service.ts       # Device detection
│   │   │   ├── data.service.ts           # HTTP client wrapper
│   │   │   ├── layout.service.ts         # UI layout state
│   │   │   ├── swiper.service.ts         # Carousel management
│   │   │   ├── UI.service.ts             # UI utilities
│   │   │   └── mock-data.service.ts      # Demo data
│   │   ├── shared/             # Reusable UI components
│   │   │   ├── header/         # App header
│   │   │   ├── footer/         # App footer
│   │   │   ├── menu/           # Side menu
│   │   │   ├── tab/            # Tab navigation
│   │   │   ├── chat-button/    # Floating chat button (NEW)
│   │   │   └── gemini-button/  # AI assistant button (NEW)
│   │   ├── app.module.ts       # Root module
│   │   ├── app.component.ts    # Root component
│   │   └── app-routing.module.ts # Route configuration
│   ├── environments/           # Environment configs
│   │   ├── environment.ts      # Development
│   │   └── environment.prod.ts # Production
│   ├── assets/                 # Static resources
│   │   ├── icon/              # App icons
│   │   └── js/                # Standalone scripts
│   ├── style/                  # Global styles
│   │   ├── global.scss        # Main stylesheet
│   │   └── styles.css         # Tailwind source
│   ├── theme/                  # Ionic theming
│   │   └── variables.scss     # CSS variables
│   └── index.html              # HTML entry point
├── API/                         # Backend REST API (DEPLOYED ON VERCEL)
│   # NOTE: API is deployed externally, not in local repository
│   # Backend URL: https://vercel-express-api-alpha.vercel.app
│   # API source code is maintained separately and deployed to Vercel
├── PHP/                         # PHP error tracking
│   └── composer.json           # Sentry integration
├── www/                         # Build output (Angular)
├── angular.json                 # Angular CLI config
├── capacitor.config.ts          # Capacitor config
├── ionic.config.json            # Ionic CLI config
├── tsconfig.json                # TypeScript config
├── karma.conf.js                # Test runner config
├── package.json                 # Root dependencies + scripts
└── README.md                    # Basic project info
```

---

## Technology Stack

### Frontend
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Angular | 20.3.3 | SPA framework |
| **Mobile Framework** | Ionic | 8.7.9 | UI components + native wrapper |
| **Language** | TypeScript | 5.9.3 | Type-safe JavaScript |
| **State Management** | RxJS | 7.8.2 | Reactive state via Observables |
| **Styling** | Tailwind CSS | 4.1.14 | Utility-first CSS |
| **Styling** | SCSS | - | Component-scoped styles |
| **Search** | Algolia | 5.42.0 | Full-text search engine |
| **Maps** | Leaflet | 1.9.4 | Interactive maps |
| **Carousels** | Swiper | 12.0.2 | Touch sliders |
| **Native** | Capacitor | 7.4.3 | iOS/Android bridge |
| **Auth** | Firebase Auth | 12.5.0 | User authentication |
| **Database** | Firestore | 12.5.0 | NoSQL cloud database |
| **Real-time** | Socket.IO Client | 4.8.1 | Real-time chat communication |
| **AI** | Google Gemini | - | AI assistant integration |

### Backend
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Deployment** | Vercel | - | External API hosting |
| **Runtime** | Node.js | - | JavaScript runtime |
| **Framework** | Express | 5.1.0 | REST API server |
| **Auth** | Firebase Admin | 13.5.0 | JWT verification |
| **Middleware** | CORS | 2.8.5 | Cross-origin requests |
| **Module System** | ES Modules | - | `import`/`export` syntax |
| **Real-time** | Socket.IO Server | - | WebSocket server |

### DevOps & Tools
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Testing** | Jasmine + Karma | 5.11.0 / 6.4.4 | Unit testing |
| **Linting** | ESLint | 9.36.0 | Code quality |
| **Build Tool** | Angular CLI | 20.3.4 | Build automation |
| **Package Manager** | npm | - | Dependency management |
| **Error Tracking** | Sentry | - | PHP error monitoring |
| **PWA** | Angular Service Worker | 20.3.3 | Offline support |

---

## Architecture Patterns

### 1. Module Architecture
- **Lazy Loading:** Each page is a separate module loaded on-demand
- **Shared Module:** Reusable components exported globally
- **Core Services:** Singleton services with `providedIn: 'root'`

### 2. State Management
- **No Redux/NgRx:** Uses RxJS BehaviorSubjects for state
- **Observable Pattern:** Services expose `Observable<T>` streams
- **Async Pipe:** Templates subscribe via `| async` pipe

**Example Pattern:**
```typescript
// Service
private authToken = new BehaviorSubject<string | null>(null);
public authToken$ = this.authToken.asObservable();

// Component template
{{ authToken$ | async }}
```

### 3. Naming Conventions
| Type | Convention | Example |
|------|-----------|---------|
| **Components** | `*Page` or `*Component` suffix | `home.page.ts` |
| **Services** | `*.service.ts` | `auth.service.ts` |
| **Modules** | `*.module.ts` | `home.module.ts` |
| **Routing** | `*-routing.module.ts` | `app-routing.module.ts` |
| **Selectors** | `app-` prefix (kebab-case) | `<app-header>` |
| **Classes** | PascalCase | `AuthService` |
| **Variables** | camelCase | `authToken` |

### 4. File Organization
- **One component per file:** No multiple components in one file
- **Co-location:** Keep related files together (component, template, styles, spec)
- **Service layer:** All API calls go through services, not components

### 5. Data Flow
```
Component ← Observable ← BehaviorSubject ← Service ← HTTP ← API ← Firestore
```

### 6. Error Handling
- **Try-Catch:** All async operations wrapped in try-catch
- **RxJS catchError:** HTTP errors handled with `catchError` operator
- **User-Friendly Messages:** Firebase auth errors translated to readable text
- **Console Logging:** Development debugging via `console.log/error`

### 7. Centralized App State (NEW in v1.1.0)

**Location:** `src/app/app.component.ts`

The application now uses a centralized state management system through `AppComponent`:

```typescript
export interface AppState {
  sessionId: string;        // Unique session identifier
  isLoggedIn: boolean;      // Authentication status
  uid: string | null;       // Firebase user ID
  displayName: string | null;  // User display name
  email: string | null;     // User email
}
```

**Key Features:**
- **Single Source of Truth:** All critical app state stored in `AppComponent`
- **Observable Pattern:** Components subscribe to `appState$` observable
- **Persistent Storage:** State saved to `localStorage` for session continuity
- **Session Management:** Session ID stored in `sessionStorage` (clears on tab close)
- **Auto-sync:** Automatically updates when auth state changes

**Usage Example:**
```typescript
// In any component - inject AppComponent
constructor(private app: AppComponent) {}

ngOnInit() {
  // Subscribe to app state changes
  this.app.appState$.subscribe(state => {
    console.log('User logged in:', state.isLoggedIn);
    console.log('User ID:', state.uid);
  });

  // Get current state synchronously
  const currentState = this.app.appState;
}
```

**Benefits:**
- Simplified authentication checks across components
- Consistent state management
- Easy access to session information
- Reduced dependency on multiple service injections

---

## API Documentation

### Base URLs
- **Production (Primary):** `https://vercel-express-api-alpha.vercel.app`
- **Development (Optional):** `http://localhost:3000` (requires local API setup)

**Note:** The API backend is deployed on Vercel. Local development uses the production API by default. To run a local API server, you would need to set up the backend separately (not included in this repository).

### Security Requirements

**All endpoints require API passcode header:**
```
x-api-passcode: PourRice
```

**Protected endpoints additionally require Firebase authentication:**
```
Authorization: Bearer <firebase-id-token>
```

### Complete API Reference

#### Authentication Routes (`/API/Auth`)
| Method | Endpoint | Auth | Description | Request Body |
|--------|----------|------|-------------|--------------|
| POST | `/register` | ❌ | Create new user account | `{ email, password, displayName }` |
| POST | `/login` | ❌ | Email/password login | `{ email, password }` |
| POST | `/google` | ❌ | Google OAuth authentication | `{ idToken }` |
| POST | `/verify` | ❌ | Verify Firebase ID token | `{ idToken }` |
| POST | `/reset-password` | ❌ | Send password reset email | `{ email }` |
| POST | `/logout` | ❌ | Revoke user refresh tokens | `{ uid }` |
| DELETE | `/delete-account` | ❌ | Delete user account permanently | `{ uid }` |

#### Restaurant Routes (`/API/Restaurants`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ❌ | List all restaurants |
| GET | `/:id` | ❌ | Get single restaurant |
| POST | `/` | ❌ | Create new restaurant |
| PUT | `/:id` | ❌ | Update restaurant |
| DELETE | `/:id` | ❌ | Delete restaurant |
| POST | `/:id/image` | ✅ | Upload restaurant image |

**Restaurant Request Body Fields:**
```typescript
{
  Name_EN?: string;
  Name_TC?: string;
  Address_EN?: string;
  Address_TC?: string;
  District_EN?: string;
  District_TC?: string;
  Latitude?: number;
  Longitude?: number;
  Keyword_EN?: string[];
  Keyword_TC?: string[];
  ImageUrl?: string;
  Seats?: number;
  Owner?: string;  // User UID
  Contacts?: {
    Phone?: string;
    Email?: string;
    Website?: string;
  };
  Opening_Hours?: {
    [day: string]: string;
  };
}
```

#### Menu Sub-collection (`/API/Restaurants/:restaurantId/menu`)
**Important:** Menu items are stored as a **sub-collection**, not an array field.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/:restaurantId/menu` | ❌ | List menu items for restaurant |
| GET | `/:restaurantId/menu/:menuItemId` | ❌ | Get single menu item |
| POST | `/:restaurantId/menu` | ❌ | Create menu item |
| PUT | `/:restaurantId/menu/:menuItemId` | ❌ | Update menu item |
| DELETE | `/:restaurantId/menu/:menuItemId` | ❌ | Delete menu item |

**Menu Item Request Body:**
```typescript
{
  Name_EN?: string;
  Name_TC?: string;
  Description_EN?: string;
  Description_TC?: string;
  Price?: number;
  ImageUrl?: string;
}
```

#### User Routes (`/API/Users`)
| Method | Endpoint | Auth | Description | Ownership |
|--------|----------|------|-------------|-----------|
| GET | `/` | ❌ | List all users | Public |
| GET | `/:uid` | ❌ | Get single user profile | Public |
| POST | `/` | ✅ | Create user profile | UID must match token |
| PUT | `/:uid` | ✅ | Update user profile | UID must match token |
| DELETE | `/:uid` | ✅ | Delete user profile | UID must match token |

**User Request Body:**
```typescript
{
  uid: string;  // Firebase Auth UID
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  type?: 'customer' | 'admin';
  restaurantId?: string;
  bio?: string;
  preferences?: {
    language?: 'EN' | 'TC';
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}
```

#### Booking Routes (`/API/Bookings`)
| Method | Endpoint | Auth | Description | Ownership |
|--------|----------|------|-------------|-----------|
| GET | `/` | ✅ | List bookings (auto-filtered by userId) | Own bookings only |
| GET | `/:id` | ✅ | Get single booking | Own booking only |
| POST | `/` | ✅ | Create new booking | userId auto-set from token |
| PUT | `/:id` | ✅ | Update booking | Own booking only |
| DELETE | `/:id` | ✅ | Delete booking | Own booking only |

**Booking Request Body (POST):**
```typescript
{
  restaurantId: string;       // Required
  restaurantName: string;     // Required (denormalized)
  dateTime: string;           // Required (ISO 8601)
  numberOfGuests: number;     // Required
  specialRequests?: string;
  // userId automatically set from auth token
  // status defaults to 'pending'
  // paymentStatus defaults to 'paid' (development)
}
```

**Booking Request Body (PUT):**
```typescript
{
  dateTime?: string;
  numberOfGuests?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  specialRequests?: string;
}
```

#### Review Routes (`/API/Reviews`)
| Method | Endpoint | Auth | Description | Filters |
|--------|----------|------|-------------|---------|
| GET | `/` | ❌ | List all reviews | `?restaurantId=X` or `?userId=X` |
| GET | `/:id` | ❌ | Get single review | - |
| POST | `/` | ✅ | Create new review | userId auto-set from token |
| PUT | `/:id` | ✅ | Update review | Own review only |
| DELETE | `/:id` | ✅ | Delete review | Own review only |
| GET | `/Restaurant/:restaurantId/stats` | ❌ | Get review statistics | Aggregate data |

**Review Request Body (POST):**
```typescript
{
  restaurantId: string;    // Required
  rating: number;          // Required (typically 1-5)
  comment?: string;
  // userId automatically set from auth token
  // dateTime automatically set to current time
}
```

**Review Statistics Response:**
```typescript
{
  restaurantId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
```

#### Image Routes (`/API/Images`)
| Method | Endpoint | Auth | Description | Content-Type |
|--------|----------|------|-------------|--------------|
| POST | `/upload` | ✅ | Upload image to Firebase Storage | `multipart/form-data` |
| DELETE | `/delete` | ✅ | Delete image from Firebase Storage | `application/json` |
| GET | `/metadata` | ❌ | Get image metadata | - |

**Upload Request:**
- Form field name: `image`
- Max file size: 10MB
- Supported formats: JPEG, PNG, GIF, WebP

**Upload Response:**
```typescript
{
  imageUrl: string;  // Signed URL (expires 2500-03-01)
}
```

#### Search Routes (`/API/Algolia`)
| Method | Endpoint | Auth | Description | Query Params |
|--------|----------|------|-------------|--------------|
| GET | `/Restaurants` | ❌ | Search restaurants | `?query=X&district=Y&keywords=Z` |
| GET | `/Restaurants/facets/:facetName` | ❌ | Get facet values | - |
| POST | `/Restaurants/advanced` | ❌ | Advanced search | Custom filters in body |

**Search Query Parameters:**
```typescript
{
  query?: string;           // Full-text search (searches both EN and TC)
  district?: string;        // Filter by District_EN or District_TC
  keywords?: string[];      // Filter by Keyword_EN or Keyword_TC
  page?: number;            // Pagination (default: 0)
  hitsPerPage?: number;     // Results per page (default: 20)
}
```

**Facet Names:**
- `District_EN` / `District_TC`
- `Keyword_EN` / `Keyword_TC`

#### AI Routes (`/API/Gemini`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/generate` | ❌ | Generate text content |
| POST | `/chat` | ❌ | Chat with AI (conversation history supported) |
| POST | `/restaurant-description` | ❌ | Generate restaurant description |

**Generate Request:**
```typescript
{
  prompt: string;
}
```

**Chat Request:**
```typescript
{
  message: string;
  history?: Array<{
    role: 'user' | 'model';
    parts: string;
  }>;
}
```

**Restaurant Description Request:**
```typescript
{
  restaurantName: string;
  cuisine?: string;
  specialties?: string[];
  atmosphere?: string;
}
```

#### Chat Routes (`/API/Chat`)
| Method | Endpoint | Auth | Description | Notes |
|--------|----------|------|-------------|-------|
| GET | `/Rooms` | ✅ | List all chat rooms | Filtered by participant |
| GET | `/Rooms/:roomId` | ✅ | Get single chat room | Participant verification |
| POST | `/Rooms` | ✅ | Create new chat room | - |
| GET | `/Rooms/:roomId/Messages` | ✅ | List messages | Pagination supported |
| POST | `/Rooms/:roomId/Messages` | ✅ | Save message | - |
| PUT | `/Rooms/:roomId/Messages/:messageId` | ✅ | Edit message | Own message only |
| DELETE | `/Rooms/:roomId/Messages/:messageId` | ✅ | Delete message | Soft delete, own message only |
| GET | `/Stats` | ✅ | Get chat statistics | User-specific stats |

**Create Room Request:**
```typescript
{
  name?: string;
  participants: string[];  // Array of user UIDs
  type?: 'direct' | 'group';
}
```

**Send Message Request:**
```typescript
{
  content: string;
  type?: 'text' | 'image' | 'file';
  // senderId automatically set from auth token
  // timestamp automatically set to current time
}
```

**List Messages Query Parameters:**
```typescript
{
  limit?: number;      // Default: 50
  before?: string;     // Message ID for pagination (older messages)
  after?: string;      // Message ID for pagination (newer messages)
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, POST with response body |
| 201 | Created | Successful resource creation |
| 204 | No Content | Successful PUT, DELETE (no response body) |
| 400 | Bad Request | Missing required fields, invalid data |
| 401 | Unauthorized | Missing/invalid auth token |
| 403 | Forbidden | Ownership violation, insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (e.g., duplicate user) |
| 500 | Internal Server Error | Unexpected server error |

### Error Response Format

All errors follow this structure:
```json
{
  "error": "Human-readable error message"
}
```

### Data Sanitization

The backend automatically sanitizes all responses:
- `null` / `undefined` → `'—'` (em dash)
- Missing `ImageUrl` → Placeholder URL from environment
- Recursive sanitization for nested objects and arrays
- Firestore timestamps → ISO 8601 strings

### Frontend Integration Patterns

#### Using DataService (Recommended)
```typescript
// In component
constructor(private dataService: DataService) {}

async loadRestaurants() {
  this.restaurants$ = this.dataService.get<{ count: number; data: Restaurant[] }>(
    '/API/Restaurants'
  );
}

async createBooking(bookingData: Partial<Booking>) {
  const result = await this.dataService.post<{ id: string }>(
    '/API/Bookings',
    bookingData
  ).toPromise();
  
  console.log('Created booking:', result.id);
}
```

#### Authentication Token Handling
The `DataService` automatically attaches the Firebase ID token to all requests. Ensure the user is authenticated before calling protected endpoints:
```typescript
// In service
async function protectedOperation() {
  const user = await this.authService.getCurrentUser().pipe(first()).toPromise();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Token automatically attached by DataService
  return this.dataService.post('/API/Bookings', data);
}
```

### Testing API Endpoints

#### Using cURL
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

#### Using Postman
1. Set base URL: `https://vercel-express-api-alpha.vercel.app`
2. Add header: `x-api-passcode: PourRice`
3. For protected routes, add header: `Authorization: Bearer <token>`
4. Set `Content-Type: application/json` for POST/PUT requests

---

## Data Models

### Firestore Collections
**Refer to the API for the most accurate fields.**

#### 1. Restaurants
**Collection:** `Restaurants`
**Document ID:** Auto-generated

```typescript
interface Restaurant {
  id: string;                    // Auto-generated
  Name_EN?: string;              // English name
  Name_TC?: string;              // Traditional Chinese name
  Address_EN?: string;           // English address
  Address_TC?: string;           // Traditional Chinese address
  District_EN?: string;          // District (English)
  District_TC?: string;          // District (Chinese)
  Latitude?: number;             // Geo coordinates
  Longitude?: number;
  Keyword_EN?: string[];         // Search keywords (English)
  Keyword_TC?: string[];         // Search keywords (Chinese)
  Menu?: MenuItem[];             // Menu items
  Opening_Hours?: {              // Operating hours
    [day: string]: string | { open?: string; close?: string };
  };
  Seats?: number;                // Capacity
  Contacts?: {                   // Contact info
    Phone?: string;
    Email?: string;
    Website?: string;
  };
  ImageUrl?: string;             // Restaurant image
  createdAt: Timestamp;          // Auto-set
  modifiedAt?: Timestamp;        // Auto-updated
}

interface MenuItem {
  name_EN?: string;
  name_TC?: string;
  price?: number;
  description_EN?: string;
  description_TC?: string;
}
```

#### 2. Users
**Collection:** `Users`
**Document ID:** Firebase Auth UID

```typescript
interface User {
  uid: string;                   // Firebase Auth UID (same as doc ID)
  email?: string;                // User email
  displayName?: string;          // Display name
  photoURL?: string;             // Profile picture URL
  emailVerified: boolean;        // Email verification status
  preferences?: {
    language?: 'EN' | 'TC';      // UI language preference
    theme?: 'light' | 'dark';    // Theme preference
    notifications?: boolean;     // Notification opt-in
  };
  loginCount?: number;           // Login tracking
  lastLoginAt?: Timestamp;       // Last login timestamp
  createdAt: Timestamp;          // Account creation
  modifiedAt?: Timestamp;        // Last profile update
}
```

#### 3. Bookings
**Collection:** `Bookings`
**Document ID:** Auto-generated

```typescript
interface Booking {
  id: string;                    // Auto-generated
  userId: string;                // Foreign key → Users.uid
  restaurantId: string;          // Foreign key → Restaurants.id
  dateTime: Timestamp;           // Booking date/time
  numberOfGuests: number;        // Party size
  status?: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'paid';
  specialRequests?: string;      // Optional notes
  createdAt: Timestamp;          // Auto-set
  modifiedAt?: Timestamp;        // Auto-updated
}
```

### Indexing Strategy
Firestore auto-indexes simple queries. Create composite indexes for:
- `Bookings`: `userId + status`
- `Bookings`: `restaurantId + dateTime`
- `Restaurants`: `District_EN + Keyword_EN` (for Algolia sync)

---

## Development Workflow

### Prerequisites
```bash
# Install dependencies with legacy peer deps flag
npm install --legacy-peer-deps

# Install API dependencies
cd API && npm install && cd ..
```

### Development Scripts

#### Start Full Stack (Concurrent)
```bash
npm run dev
# Runs both API server (port 3000) + Angular dev server (port 4200)
```

#### Start Backend Only
```bash
npm run start:api
# Runs API at http://localhost:3000
# Requires: API/serviceAccountKey.json
```

#### Start Frontend Only
```bash
npm start
# OR: ng serve
# Runs Angular dev server at http://localhost:4200
```

#### Build Commands
```bash
# Production build
npm run build
# Output: www/

# Watch mode (development)
npm run watch

# Build Tailwind CSS
npm run build:tailwind

# Watch Tailwind CSS (auto-rebuild on changes)
npm run watch:tailwind

# Build Algolia TypeScript bundle
npm run build:algolia

# Build all scripts (Algolia + Chatbot)
npm run build:all-scripts
```

#### Testing
```bash
npm test
# Runs Jasmine tests via Karma
# Coverage output: coverage/
```

#### Linting
```bash
npm run lint
# Runs ESLint with Angular rules
```

#### Native Builds
```bash
# Sync web assets to native projects
npx cap sync

# Open in IDE
npx cap open ios
npx cap open android

# Build for production
ionic capacitor build ios
ionic capacitor build android
```

### Environment Configuration

**Development** (`src/environments/environment.ts`):
```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef'
  },
  apiUrl: 'http://localhost:3000',
  algoliaAppId: 'V9HMGL1VIZ',
  algoliaSearchKey: '563754aa2e02b4838af055fbf37f09b5'
};
```

**Production** (`src/environments/environment.prod.ts`):
- Same structure, different values
- Auto-replaces `environment.ts` during production builds

### Port Configuration
- **Frontend:** `4200` (Angular dev server)
- **Backend API:** `3000` (Express)
- **Static Server:** `8080` (npm script `start:app:static`)

---

## Key Services

### 1. AuthService (`auth.service.ts`)
**Purpose:** Firebase authentication management
**Key Methods:**
- `login(email, password)` - Email/password login
- `loginWithGoogle()` - Google OAuth
- `logout()` - Sign out
- `getCurrentUser()` - Get current user observable
- `getIdToken()` - Get JWT token for API calls

**State:**
- `currentUser$: Observable<User | null>` - Auth state stream

### 2. RestaurantsService (`restaurants.service.ts`)
**Purpose:** Restaurant data management
**Key Methods:**
- `getRestaurants()` - Fetch all restaurants
- `getRestaurant(id)` - Fetch single restaurant
- `createRestaurant(data)` - Create new restaurant
- `updateRestaurant(id, data)` - Update restaurant
- `deleteRestaurant(id)` - Delete restaurant

**Uses:** DataService for HTTP calls

### 3. UserService (`user.service.ts`)
**Purpose:** User profile management
**Key Methods:**
- `getUserProfile(uid)` - Fetch user profile
- `createUserProfile(data)` - Create profile (auto after first login)
- `updateUserProfile(uid, data)` - Update profile
- `deleteUserProfile(uid)` - Delete profile

**State:**
- Stores auth token for API requests

### 4. GuardService (`guard.service.ts`)
**Purpose:** Route protection
**Implements:** `CanActivate`
**Behavior:**
- Checks if user is authenticated
- Redirects to `/login` if not authenticated
- Used on `/user` route

### 5. ThemeService (`theme.service.ts`)
**Purpose:** Dark/light mode management
**Key Methods:**
- `toggleTheme()` - Switch themes
- `initializeTheme()` - Detect system preference
- `getCurrentTheme()` - Get active theme

**Storage:** localStorage (`theme`)

### 6. LanguageService (`language.service.ts`)
**Purpose:** EN/TC language switching
**Key Methods:**
- `setLanguage(lang: 'EN' | 'TC')` - Change language
- `getCurrentLanguage()` - Get active language

**Storage:** localStorage (`language`)

### 7. PlatformService (`platform.service.ts`)
**Purpose:** Device/platform detection
**Key Methods:**
- `isMobile()` - Check if mobile device
- `isWeb()` - Check if web platform
- `isNative()` - Check if Capacitor native app

**State:**
- `platform$: Observable<string>` - Platform type stream

### 8. DataService (`data.service.ts`) - UPDATED in v1.1.0
**Purpose:** Simple HTTP client wrapper (no longer manages auth internally)

**Key Methods:**
- `get<T>(endpoint, authToken?)` - GET request
- `post<T>(endpoint, body, authToken?)` - POST request
- `put<T>(endpoint, body, authToken?)` - PUT request
- `delete<T>(endpoint, authToken?)` - DELETE request

**Features:**
- Simple cURL-style HTTP helper
- Auto-attaches API passcode (`x-api-passcode: PourRice`)
- Optional auth token parameter (pass from caller)
- Base URL from environment config
- Error handling with catchError

**Usage:**
```typescript
// Without auth
this.dataService.get<Restaurant[]>('/API/Restaurants').subscribe(...);

// With auth (get token from AuthService)
const token = await this.authService.getIdToken();
this.dataService.post('/API/Bookings', data, token).subscribe(...);
```

**Breaking Change from v1.0:**
- No longer injects `AuthService`
- Callers must pass auth token explicitly if needed
- More flexible and decoupled architecture

### 9. LayoutService (`layout.service.ts`)
**Purpose:** UI layout state management
**State:**
- Header visibility
- Menu state
- Tab bar visibility

### 10. SwiperService (`swiper.service.ts`)
**Purpose:** Carousel management
**Used By:** Home page featured content

### 11. MockDataService (`mock-data.service.ts`)
**Purpose:** Demo data for development
**Provides:**
- Sample offers
- Sample articles
- Sample reviews

### 12. UIService (`UI.service.ts`)
**Purpose:** UI utility functions
**Features:**
- Toast notifications
- Loading spinners
- Alert dialogs

### 13. BookingService (`booking.service.ts`)
**Purpose:** Booking/reservation management
**Key Methods:**
- `getBookings()` - Fetch user's bookings
- `getBooking(id)` - Fetch single booking
- `createBooking(data)` - Create new reservation
- `updateBooking(id, data)` - Update booking
- `deleteBooking(id)` - Cancel booking

**Uses:** DataService for HTTP calls with API passcode

### 14. ReviewsService (`reviews.service.ts`)
**Purpose:** Restaurant review management
**Key Methods:**
- `getReviews(restaurantId)` - Fetch restaurant reviews
- `createReview(data)` - Submit review
- `updateReview(id, data)` - Update review
- `deleteReview(id)` - Delete review
- `getReviewStats(restaurantId)` - Get review statistics

**Uses:** DataService for HTTP calls

### 15. LocationService (`location.service.ts`)
**Purpose:** GPS and distance calculations
**Key Methods:**
- `getCurrentPosition()` - Get device GPS coordinates
- `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine formula
- `formatDistance(meters)` - Human-readable distance

**Features:**
- Geolocation API integration
- Distance calculation with Haversine algorithm
- Coordinate validation

### 16. ChatService (`chat.service.ts`) - NEW in v1.4.0
**Purpose:** Real-time chat via Socket.IO
**Key Methods:**
- `connect()` - Connect to Socket.IO server
- `disconnect()` - Close connection
- `joinRoom(roomId)` - Join chat room
- `sendMessage(roomId, message)` - Send message
- `sendTypingIndicator(roomId, isTyping)` - Send typing status

**Features:**
- Socket.IO client integration
- Room-based messaging
- Typing indicators
- Online/offline status tracking
- Auto-reconnection with exponential backoff
- Observable message streams

**State:**
- `messages$: Observable<ChatMessage>` - Message stream
- `connectionStatus$: Observable<boolean>` - Connection state

### 17. GeminiService (`gemini.service.ts`) - NEW in v1.4.0
**Purpose:** Google Gemini AI assistant integration
**Key Methods:**
- `chat(message, history?)` - Conversational AI
- `generate(prompt)` - Text generation
- `askAboutRestaurant(question, restaurantName)` - Restaurant-specific queries
- `getDiningRecommendation(preferences)` - Personalized recommendations

**Features:**
- Google Gemini API integration
- Chat history management
- Restaurant context awareness
- Error handling and retry logic
- Bilingual support (EN/TC)

**Uses:** DataService for HTTP calls to `/API/Gemini` endpoints

---

## Routing & Navigation

### Route Configuration
**File:** `src/app/app-routing.module.ts`

| Path | Component | Auth | Data (Titles) |
|------|-----------|------|---------------|
| `/` | → `/home` | ❌ | Redirect |
| `/home` | HomePage | ❌ | Home / 主頁 |
| `/search` | SearchPage | ❌ | Search / 搜尋 |
| `/restaurant/:id` | RestaurantPage | ❌ | Restaurant / 餐廳 |
| `/user` | UserPage | ✅ | Account / 帳戶 |
| `/login` | LoginPage | ❌ | Login / 登入 |
| `/test` | TestPage | ❌ | Test / 測試 |

### Route Guards
- **AuthGuard:** Protects `/user` route
- **Redirect:** Unauthenticated users → `/login`

### Lazy Loading Strategy
- **PreloadAllModules:** All modules preloaded after initial load
- Each page is a separate lazy-loaded module
- Improves initial load performance

### Navigation Pattern
```typescript
// In component
import { Router } from '@angular/router';

constructor(private router: Router) {}

navigateToRestaurant(id: string) {
  this.router.navigate(['/restaurant', id]);
}
```

### Bilingual Route Data
Routes include bilingual titles in `data` property:
```typescript
{
  path: 'home',
  data: { title: { Header_EN: 'Home', Header_TC: '主頁' } },
  loadChildren: () => import('./pages/home/home.module')...
}
```

Used by header component to display correct title based on language preference.

---

## Security Conventions

### 1. Authentication Flow
```
1. User logs in via Firebase Auth (email/password or Google OAuth)
2. Firebase returns ID token (JWT)
3. Token stored in UserService
4. Token attached to all authenticated API requests via DataService
5. Backend verifies token with Firebase Admin SDK
6. Backend extracts UID from verified token
7. Backend attaches UID to request object
```

### 2. API Security
**Authentication Middleware** (`API/API.js:115-136`):
```javascript
async function authenticate(request, response, next) {
  const authHeader = request.headers.authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorised' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  request.uid = decodedToken.uid; // Attach verified UID
  next();
}
```

**Ownership Verification** (`API/API.js:95-97`):
```javascript
const verifyOwnership = (authenticatedUid, resourceUid) => {
  return authenticatedUid === resourceUid;
};
```

### 3. Security Rules
1. **User Operations:**
   - Users can only create their own profile (uid must match token)
   - Users can only update/delete their own profile
   - GET endpoints are public (for admin dashboards)

2. **Booking Operations:**
   - Users can only view their own bookings
   - Users can only create bookings for themselves
   - Users can only update/delete their own bookings
   - `userId` automatically set to authenticated UID (prevents spoofing)

3. **Restaurant Operations:**
   - Currently public (no auth required)
   - Consider adding admin-only protection for CUD operations

### 4. Frontend Security
- **Route Guards:** Protect authenticated routes
- **Token Storage:** Stored in service memory (not localStorage - XSS risk)
- **Token Refresh:** Handle token expiry with re-authentication
- **HTTPS Only:** Production should enforce HTTPS

### 5. CORS Configuration
```javascript
// API/API.js:30
app.use(cors());
// Allows all origins (development)
// Production: Restrict to specific domains
```

**Recommendation for Production:**
```javascript
app.use(cors({
  origin: ['https://yourdomain.com'],
  credentials: true
}));
```

### 6. Sensitive Files
**Never commit:**
- `API/serviceAccountKey.json` (Firebase Admin credentials)
- `.env` files with API keys
- `src/environments/environment.prod.ts` (production config)

**Use `.gitignore`:**
```
serviceAccountKey.json
.env
environment.prod.ts
```

---

## Styling Conventions

### 1. Style Hierarchy
```
Global Styles (lowest specificity)
  ↓
Ionic Theme Variables
  ↓
Tailwind Utilities
  ↓
Component SCSS (highest specificity)
```

### 2. Global Styles
**File:** `src/style/global.scss`
- Tailwind output (compiled from `styles.css`)
- Applied globally to all components

**File:** `src/theme/variables.scss`
- Ionic CSS variables
- Theme color definitions
- Dark/light mode variables

### 3. Component Styles
**Pattern:** Each component has a `*.scss` file
- Scoped to component (Angular ViewEncapsulation)
- Use SCSS variables, mixins, nesting
- Import Ionic utilities if needed

**Example:**
```scss
// home.page.scss
.home-container {
  padding: 16px;

  .featured-card {
    background: var(--ion-color-light);
    border-radius: 8px;
  }
}
```

### 4. Tailwind CSS
**Source:** `src/style/styles.css`
**Output:** `.src/style/global.scss` (compiled)
**Build:** `npm run build:tailwind`

**Usage:**
```html
<div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800">
  <h1 class="text-2xl font-bold">Title</h1>
</div>
```

**Dark Mode:**
- Uses `class` strategy (not `media`)
- Toggle via ThemeService
- Applies `.dark` class to `<html>` element

### 5. Theming System
**Light/Dark Modes:**
```scss
// variables.scss
:root {
  --ion-color-primary: #3880ff;
  --ion-background-color: #ffffff;
}

.dark {
  --ion-color-primary: #4c8dff;
  --ion-background-color: #000000;
}
```

**Switching:**
```typescript
// theme.service.ts
toggleTheme() {
  document.documentElement.classList.toggle('dark');
}
```

### 6. Responsive Design
**Ionic Breakpoints:**
```scss
// Mobile-first approach
@media (min-width: 576px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 992px) { /* lg */ }
@media (min-width: 1200px) { /* xl */ }
```

**Tailwind Breakpoints:**
```html
<div class="text-sm md:text-base lg:text-lg">Responsive</div>
```

### 7. Ionic Components
Prefer Ionic components over custom HTML:
```html
<!-- Good -->
<ion-button>Click Me</ion-button>
<ion-card>...</ion-card>

<!-- Avoid unless necessary -->
<button class="custom-btn">Click Me</button>
```

### 8. Style Naming
- **kebab-case** for class names
- **BEM** methodology optional but recommended
- Prefix custom classes to avoid conflicts: `.app-*`

### 9. Loading States & Spinners
**Custom Loading Indicator:**
- **Asset:** `src/assets/icon/Eclipse.gif`
- **Usage:** All loading states use Eclipse.gif instead of default Ionic spinners

**Implementation Patterns:**

**HTML Loading Containers:**
```html
<div class="loading-container" *ngIf="isLoading">
  <img src="assets/icon/Eclipse.gif" alt="Loading" class="loading-spinner">
  <p>Loading message here</p>
</div>
```

**SCSS Styling:**
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

**Button Spinners:**
```html
<ion-button [disabled]="isSubmitting">
  <img src="assets/icon/Eclipse.gif" alt="Saving" class="button-spinner" *ngIf="isSubmitting">
  <span *ngIf="!isSubmitting">Save</span>
</ion-button>
```

**LoadingController (TypeScript):**
```typescript
const loading = await this.loadingController.create({
  message: 'Loading...',
  spinner: null  // Hide default spinner, message only
});
```

**Pull-to-Refresh:**
```html
<ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
  <ion-refresher-content
    pullingIcon="assets/icon/Eclipse.gif"
    refreshingSpinner="none">
    <img src="assets/icon/Eclipse.gif" alt="Refreshing" class="refresher-spinner">
  </ion-refresher-content>
</ion-refresher>
```

**Important:**
- Never use `ion-spinner` components - always use Eclipse.gif
- LoadingController instances set `spinner: null` to hide default spinners
- Keep loading messages unchanged when replacing spinners
- Consistent sizing: 60px for page loaders, 24px for button loaders, 40px for refreshers

### 10. Modern UI/UX Utilities (NEW in v1.1.0)

The global styles now include modern utility classes for consistent page layouts and components:

**Page Layout:**
```scss
.page-container {
  max-width: 1400px;        // Constrained width
  margin: 0 auto;           // Centered
  padding: 20px;            // Consistent spacing
  min-height: calc(100vh - var(--header-spacing) - var(--footer-spacing));
}
```

**Content Grid:**
```scss
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
```

**Section Headers:**
```html
<div class="section-header">
  <h2 class="section-title">Title</h2>
  <ion-button>See All</ion-button>
</div>
```

**Card Variants:**
```scss
// Standard info card
.info-card {
  background: var(--ion-card-background);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

// Highlighted gradient card
.highlight-card {
  background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary));
  color: white;
  // All child elements inherit white color
}
```

**Spacers:**
```scss
.bottom-spacer { height: 80px; }
.top-spacer { height: 40px; }
```

**Error States:**
```html
<div class="error-container">
  <ion-icon name="alert-circle-outline" class="error-icon"></ion-icon>
  <h2>Error message</h2>
  <ion-button>Retry</ion-button>
</div>
```

**Responsive Behavior:**
- All utilities adapt to mobile screens (< 768px)
- Content grids collapse to single column
- Section headers stack vertically
- Padding reduces for smaller screens

### 11. Adaptive Responsive Layout System (NEW in v1.4.0)

The application now uses a comprehensive adaptive layout system that automatically adjusts based on device type:

**Platform Detection:**
```typescript
// In component
public isMobile$: Observable<boolean>;

constructor(private platformService: PlatformService) {
  this.isMobile$ = this.platformService.isMobile$;
}
```

**Layout Classes:**
```html
<!-- In page template -->
<div class="page-container" [class.mobile-layout]="isMobile" [class.web-layout]="!isMobile">
  <!-- Page content -->
</div>
```

**Mobile Layout (`mobile-layout`):**
- **Minimal Spacing:** Zero padding to screen edges for full-width content
- **Hero Sections:** Full-width with no border radius
- **Swiper Cards:** Shows 8% of next card (slides-per-view="1.08") to indicate scrollability
- **Content Sections:** Minimal horizontal padding (12px for text, 0px for swipers)
- **Gap Between Cards:** 12px spacing between swiper slides

**Example Mobile Swiper:**
```html
<swiper-container
  [class]="isMobile ? 'offers-swiper mobile-peek' : 'offers-swiper'"
  [attr.slides-per-view]="isMobile ? '1.08' : '1.2'"
  space-between="12">
  <!-- Swiper slides -->
</swiper-container>
```

**Web Layout (`web-layout`):**
- **Left/Right Margins:**
  - **Tablet (768px-1023px):** 15% (15vw) left and right margins
  - **Desktop (1024px+):** 20% (20vw) left and right margins
- **Hero Images:** Max height of 33.33vh (1/3 of viewport height)
- **Content Sections:** Standard padding and spacing
- **Swiper Cards:** Comfortable spacing with border radius

**Hero Image Constraints:**
```scss
// Web layout - hero images limited to 1/3 screen height
.web-layout .hero-section {
  .hero-swiper, swiper-container {
    max-height: 33.33vh;
  }

  .hero-image, img {
    max-height: 33.33vh;
    object-fit: cover;
  }
}
```

**Swiper "Peek" Effect (Mobile):**
```scss
// Global CSS - mobile peek class
swiper-container.mobile-peek {
  --swiper-slides-per-view: 1.08; // Shows 8% of next card
}
```

**Responsive Margins:**
```scss
// Automatic margin adjustment
.page-container.web-layout {
  padding-left: 15vw;   // 15% on tablet
  padding-right: 15vw;
}

@media (min-width: 1024px) {
  .page-container.web-layout {
    padding-left: 20vw;   // 20% on desktop
    padding-right: 20vw;
  }
}
```

**Implementation Pattern for New Pages:**
1. Inject `PlatformService` in component constructor
2. Create `isMobile$` observable
3. Wrap page content in `<ng-container *ngIf="isMobile$ | async as isMobile">`
4. Apply `[class.mobile-layout]` and `[class.web-layout]` to page container
5. Use conditional classes for swipers: `[class]="isMobile ? 'swiper mobile-peek' : 'swiper'"`
6. Use conditional `slides-per-view`: `[attr.slides-per-view]="isMobile ? '1.08' : '1.2'"`

**Key Benefits:**
- Seamless mobile-to-web experience
- Automatic layout adjustments
- Optimized swiper behavior per platform
- Consistent spacing and margins
- Hero images properly constrained on web
- Touch-friendly mobile design with visual scroll indicators

---

## Testing Strategy

### Test Framework
- **Jasmine 5.11.0:** Test framework
- **Karma 6.4.4:** Test runner
- **Chrome Headless:** Browser for tests

### Test Files
**Pattern:** `*.spec.ts` files co-located with components/services

**Existing Tests:**
- `src/app/app.component.spec.ts`
- `src/app/pages/*/**.spec.ts` (one per page)

**Total:** 7 spec files

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --code-coverage

# Watch mode
npm test -- --watch
```

### Test Structure
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

### Testing Best Practices
1. **Test component initialization:** Verify component creates successfully
2. **Test service injection:** Ensure dependencies are injected
3. **Test public methods:** Cover all public API surfaces
4. **Mock HTTP calls:** Use `HttpClientTestingModule`
5. **Test route guards:** Verify authentication logic
6. **Test observables:** Use `done()` callback or `async`/`await`

### Coverage Goals
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

**Current Status:** Tests exist but coverage is minimal (needs expansion)

---

## Build & Deployment

### Development Build
```bash
ng build --configuration development
```
- Source maps enabled
- No optimization
- Faster build times

### Production Build
```bash
ng build --configuration production
# OR: npm run build
```

**Optimizations:**
- Ahead-of-Time (AOT) compilation
- Tree shaking (removes unused code)
- Minification
- File hashing for cache busting
- Bundle size budget enforcement

**Output:** `www/`

### Build Artifacts
```
www/
├── index.html
├── main.[hash].js
├── polyfills.[hash].js
├── runtime.[hash].js
├── styles.[hash].css
├── assets/
└── ngsw-worker.js (Service Worker)
```

### Bundle Size Budgets
**File:** `angular.json:47-57`
```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2mb",
      "maximumError": "5mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "2kb",
      "maximumError": "4kb"
    }
  ]
}
```

**Behavior:**
- Build warns if initial bundle > 2MB
- Build fails if initial bundle > 5MB
- Component styles fail if > 4KB (encourages global styles)

### Service Worker (PWA)
**Config:** `ngsw-config.json`
**Build:** Auto-included in production builds
**Features:**
- Offline support
- Asset caching
- Background sync

**Caching Strategy:**
- **app:** Prefetch (eager load all app resources)
- **assets:** Lazy load, update on prefetch

### Deployment Options

#### 1. Firebase Hosting (Recommended)
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize project
firebase init hosting

# Deploy
firebase deploy --only hosting
```

**Configuration:**
```json
// firebase.json
{
  "hosting": {
    "public": "www",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### 2. Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=www
```

#### 3. Native Deployment
```bash
# iOS (requires macOS + Xcode)
npx cap sync ios
npx cap open ios
# Build in Xcode → Archive → Distribute to App Store

# Android
npx cap sync android
npx cap open android
# Build in Android Studio → Generate Signed APK/AAB → Upload to Play Store
```

### Environment Variables
**Replace before build:**
1. Update `src/environments/environment.prod.ts`
2. Set production Firebase config
3. Set production API URL
4. Set production Algolia keys

**Do NOT commit production secrets!**

---

## Common Tasks

### Adding a New Page
```bash
# Generate page with routing
ionic generate page pages/page-name

# Manually add route to app-routing.module.ts
{
  path: 'page-name',
  loadChildren: () => import('./pages/page-name/page-name.module')
    .then(m => m.PageNamePageModule)
}
```

### Adding a New Service
```bash
# Generate service
ng generate service services/service-name

# Ensure providedIn: 'root' (default)
@Injectable({
  providedIn: 'root'
})
```

### Adding a New Component
```bash
# Generate shared component
ng generate component shared/component-name

# Add to SharedModule exports
```

### Adding an API Endpoint
1. Open `API/API.js`
2. Add route handler:
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
3. Add service method in frontend

### Updating Dependencies
```bash
# Check for updates
npm outdated

# Update specific package
npm install package-name@latest --legacy-peer-deps

# Update all (use cautiously)
npm update --legacy-peer-deps
```

### Debugging
**Frontend:**
1. Open browser DevTools
2. Check Console tab for errors
3. Use Angular DevTools extension
4. Inspect Network tab for API calls

**Backend:**
1. Check terminal output from `npm run start:api`
2. Look for `[ERROR]` logs
3. Verify Firebase credentials

**Common Issues:**
- **CORS errors:** Check API CORS middleware
- **401 Unauthorized:** Check Firebase token in request headers
- **404 Not Found:** Verify API endpoint and base URL
- **Firebase errors:** Check `serviceAccountKey.json` exists

### Database Operations
**View Firestore data:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project
3. Click "Firestore Database"
4. Browse collections

**Import data:**
```bash
# Use importData.js script
node API/importData.js
```

---

## AI Assistant Guidelines

### 🎯 General Principles
1. **Read before writing:** Always read existing files before modifying them
2. **Follow conventions:** Use established patterns (naming, structure, style)
3. **Minimal changes:** Only modify what's necessary; avoid refactoring unless asked
4. **Security first:** Never introduce vulnerabilities (XSS, SQL injection, etc.)
5. **Test-aware:** Consider test impact when making changes
6. **No emojis:** Avoid emojis in code/commits unless explicitly requested

### 📁 File Operations
- **Prefer editing:** Edit existing files rather than creating new ones
- **Read first:** Use Read tool before Edit tool
- **Co-location:** Keep related files together (component + template + styles + spec)
- **No orphans:** Don't create files without clear purpose

### 🔧 Code Patterns
**Services:**
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

**Components:**
```typescript
export class MyPage implements OnInit {
  data$: Observable<T>;

  constructor(private service: MyService) {}

  ngOnInit() {
    this.data$ = this.service.data$;
  }
}
```

**API Endpoints:**
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

### 🔒 Security Checklist
When adding/modifying protected endpoints:
- ✅ Use `authenticate` middleware
- ✅ Get authenticated UID: `getAuthenticatedUid(request)`
- ✅ Verify ownership: `verifyOwnership(authUid, resourceUid)`
- ✅ Return 403 if ownership check fails
- ✅ Auto-set `userId` on creation (don't trust client)
- ✅ Log security violations

### 🎨 Styling Approach
1. **Prefer Ionic components:** Use `<ion-button>` over `<button>`
2. **Use Tailwind for layout:** `flex`, `grid`, `p-4`, etc.
3. **Use CSS variables for colors:** `var(--ion-color-primary)`
4. **Component styles for specifics:** Complex component-specific styles in `.scss`
5. **Dark mode:** Always consider dark mode (`dark:` prefix in Tailwind)

### 🧪 Testing Expectations
When adding new features:
1. Create matching `.spec.ts` file
2. Test component creation
3. Test service methods with mocked dependencies
4. Test error handling
5. Test observable streams

### 📝 Commit Messages
**Format:**
```
<type>: <short description>

<optional body>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring
- `style:` Formatting/styling
- `test:` Add/update tests
- `docs:` Documentation
- `chore:` Maintenance

**Examples:**
- `feat: Add booking cancellation endpoint`
- `fix: Resolve authentication token expiry issue`
- `refactor: Extract ownership verification to helper`

### 🚫 Things to Avoid
1. **Don't add comments to code you didn't change**
2. **Don't add error handling for impossible scenarios**
3. **Don't create abstractions for single-use code**
4. **Don't add backwards-compatibility hacks**
5. **Don't create documentation files unless asked**
6. **Don't use `any` type in TypeScript**
7. **Don't expose sensitive data in logs**
8. **Don't skip ownership checks on protected routes**
9. **Don't use `ion-spinner` - always use Eclipse.gif for loading states**

### ✅ When Making Changes
**Frontend:**
1. Read existing component/service
2. Understand current patterns
3. Make minimal necessary changes
4. Update spec file if logic changes
5. Test in browser if UI changes

**Backend:**
1. Read API.js to understand endpoint structure
2. Follow existing error handling pattern
3. Add authentication if needed
4. Add ownership verification if modifying user data
5. Log requests with `[METHOD] /endpoint` format
6. Test with Postman/curl

**Database:**
1. Check if collection already exists
2. Follow existing field naming (PascalCase for Firestore)
3. Add timestamps (`createdAt`, `modifiedAt`)
4. Consider indexing needs

### 🔍 Understanding Request Context
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

### 📚 Knowledge Resources
- **Ionic Docs:** https://ionicframework.com/docs
- **Angular Docs:** https://angular.dev
- **Firebase Docs:** https://firebase.google.com/docs
- **Algolia Docs:** https://www.algolia.com/doc/
- **Tailwind Docs:** https://tailwindcss.com/docs

### 🆘 When Stuck
1. **Read existing code:** Look for similar implementations
2. **Check service layer:** Most logic lives in services
3. **Verify environment config:** Check if API URL/keys are correct
4. **Check browser console:** Frontend errors show here
5. **Check API logs:** Backend errors logged to terminal
6. **Ask user:** If requirements unclear, ask for clarification

---

## Quick Reference

### Key Files to Know
| File | Purpose |
|------|---------|
| `API/API.js` | Backend REST API (all endpoints) |
| `src/app/app-routing.module.ts` | Route configuration |
| `src/app/services/*.service.ts` | Business logic (12 services) |
| `src/environments/environment.ts` | Config (Firebase, API URL, Algolia) |
| `package.json` | Scripts and dependencies |
| `angular.json` | Build configuration |

### Common Commands
```bash
npm run dev              # Start full stack
npm start                # Start frontend only
npm run start:api        # Start backend only
npm test                 # Run tests
npm run build            # Production build
npm run lint             # Lint code
npx cap sync             # Sync to native
```

### API Base URL
- Development: `http://localhost:3000`
- Change in: `src/environments/environment.ts`

### Firestore Collections
- `Restaurants` - Restaurant data
- `Users` - User profiles
- `Bookings` - Reservations

### Auth Flow
1. Login → Firebase Auth → ID Token
2. Store token → UserService
3. Attach token → API requests (DataService)
4. Verify token → Backend (Firebase Admin)
5. Extract UID → Ownership checks

---

**Document Version:** 1.1
**Last Updated:** 2025-11-27
**Maintainer:** AI Assistant
**Contact:** See README.md for project contacts
**Changelog:**
- v1.1 (2025-11-27): Updated loading states to use Eclipse.gif, removed all ion-spinner usage
- v1.0 (2025-11-26): Initial comprehensive documentation

For questions or updates to this guide, please file an issue in the GitHub repository.

---

## Recent Updates (2025-11-27)

### New Features Added

#### 1. Real-Time Chat Integration (Socket.IO)
**ChatService** (`src/app/services/chat.service.ts`)
- Real-time bidirectional communication using Socket.IO
- Connects to backend Socket.IO server
- Features:
  - User registration and presence tracking
  - Room-based messaging (join/leave rooms)
  - Private direct messaging
  - Typing indicators
  - Online/offline status tracking
  - Auto-reconnection with exponential backoff

**ChatButton Component** (`src/app/shared/chat-button/`)
- Floating chat button on restaurant pages
- Allows diners to communicate with restaurant owners
- Features:
  - Real-time message display
  - Typing indicators
  - Unread message badges
  - Responsive design (mobile/desktop)
  - Bilingual support (EN/TC)
- Usage: Automatically appears on restaurant detail pages

#### 2. AI Assistant Integration (Google Gemini)
**GeminiService** (`src/app/services/gemini.service.ts`)
- AI-powered assistant using Google Gemini API
- Endpoints used:
  - `/API/Gemini/chat` - Conversational AI with history
  - `/API/Gemini/generate` - Text generation
  - `/API/Gemini/restaurant-description` - Restaurant content generation
- Features:
  - Conversation history management
  - Context-aware responses
  - Helper methods for common queries

**GeminiButton Component** (`src/app/shared/gemini-button/`) - UPDATED in v1.1.0
- Global AI assistant accessible from all pages
- **NEW:** Positioned at bottom-left corner (changed from bottom-right)
- **NEW:** Only visible when user is logged in
- Auto-dimming after 3 seconds of inactivity
- Features:
  - Conversational chat interface
  - Quick suggestion chips
  - Chat history persistence
  - Loading states with typing indicators
  - Modern gradient UI (purple-blue theme)
  - Bilingual support (EN/TC)
- Usage: Appears as floating button on all pages (except login) when authenticated

#### 3. Enhanced Data Service
**DataService** (`src/app/services/data.service.ts`)
- Centralized HTTP client wrapper
- Automatically attaches API passcode (`x-api-passcode: PourRice`)
- Automatically attaches Firebase authentication token when required
- Methods: `get()`, `post()`, `put()`, `delete()`
- Comprehensive error handling with user-friendly messages
- All existing services updated to include API passcode header

#### 4. UI/UX Modernization
**Global Styles** (`src/style/global.scss`)
- Modern card styling with hover effects
- Rounded corners (16px radius) for cards, 12px for buttons
- Enhanced button styles with shadows
- Improved form input styling
- Modern badge and chip designs
- Gradient toolbar backgrounds
- Smooth transitions for all interactive elements
- Better typography (improved font weights and letter spacing)
- Enhanced focus states for accessibility
- Responsive hover effects

### Updated Services

All HTTP services now include the required `x-api-passcode` header:
- **RestaurantsService**: Added API passcode to all requests
- **BookingService**: API passcode header standardized
- **UserService**: Added API passcode to all requests

### Dependencies Added

**socket.io-client** (latest version)
- Required for real-time chat functionality
- Installed with `npm install socket.io-client --legacy-peer-deps`

### Architecture Updates

#### Shared Module
**SharedModule** (`src/app/shared/shared.module.ts`)
- Now exports ChatButtonComponent
- Now exports GeminiButtonComponent
- Imports FormsModule for ngModel support in new components

#### Component Placement
- **GeminiButton**: Added to `app.component.html` (global availability)
- **ChatButton**: Added to restaurant detail page (`restaurant.page.html`)

### Socket.IO Integration Guide

#### Client Events (Emit)
```typescript
socket.emit('register', { userId, displayName });
socket.emit('join-room', { roomId, userId });
socket.emit('leave-room', { roomId, userId });
socket.emit('send-message', { roomId, userId, displayName, message });
socket.emit('private-message', { toUserId, fromUserId, fromDisplayName, message });
socket.emit('typing', { roomId, userId, displayName, isTyping });
```

#### Server Events (Listen)
```typescript
socket.on('registered', (data) => { /* { success, userId, socketId } */ });
socket.on('joined-room', (data) => { /* { roomId, success } */ });
socket.on('new-message', (message) => { /* ChatMessage */ });
socket.on('private-message', (message) => { /* Private message */ });
socket.on('user-typing', (data) => { /* TypingIndicator */ });
socket.on('user-online', (data) => { /* { userId, displayName, timestamp } */ });
socket.on('user-offline', (data) => { /* { userId, displayName, lastSeen } */ });
```

### Usage Examples

#### Using ChatService
```typescript
// Inject service
constructor(private chatService: ChatService) {}

// Join a room
this.chatService.joinRoom('restaurant-ABC123');

// Send message
this.chatService.sendMessage('restaurant-ABC123', 'Hello!');

// Listen for messages
this.chatService.messages$.subscribe(message => {
  console.log('New message:', message);
});

// Send typing indicator
this.chatService.sendTypingIndicator('restaurant-ABC123', true);
```

#### Using GeminiService
```typescript
// Inject service
constructor(private geminiService: GeminiService) {}

// Simple chat
this.geminiService.chat('What are your opening hours?').subscribe(response => {
  console.log('AI Response:', response);
});

// Restaurant-specific question
this.geminiService.askAboutRestaurant(
  'What are the popular dishes?',
  'Dragon Palace'
).subscribe(response => {
  console.log('Response:', response);
});

// Get recommendations
this.geminiService.getDiningRecommendation({
  cuisine: 'Italian',
  location: 'Central',
  occasion: 'romantic dinner'
}).subscribe(response => {
  console.log('Recommendations:', response);
});
```

### API Passcode Configuration

**All API requests now require the passcode header:**
```http
x-api-passcode: PourRice
```

This is automatically handled by:
- DataService (centralized)
- RestaurantsService (direct implementation)
- BookingService (direct implementation)
- UserService (direct implementation)

### Styling Guidelines

#### Modern Component Patterns
```scss
// Card with hover effect
.card {
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }
}

// Button with gradient
.gradient-button {
  background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary));
  border-radius: 12px;
  color: white;
  font-weight: 600;
}
```

### Known Considerations

1. **Socket.IO Server**: The backend Socket.IO server must be running for chat functionality to work
2. **Gemini API**: Requires valid Google Gemini API key configured in backend
3. **API Passcode**: All API endpoints require the `x-api-passcode: PourRice` header
4. **Authentication**: Chat and Gemini services require user to be logged in
5. **Mobile**: Both chat and Gemini buttons are fully responsive and mobile-friendly

### Future Enhancements

- Persist chat messages to Firestore
- Add file/image sharing in chat
- Add voice input for Gemini assistant
- Add chat notifications
- Add message read receipts
- Add chat room persistence across sessions

---

## Known Issues & Fixes

### Image URL Em Dash Bug (Fixed in v1.5.2)

**Issue:** After opening any modal in the app, the application would freeze and become unresponsive. A hard refresh was required to restore functionality, and navigation between tabs was completely broken.

**Root Cause:** The backend API sanitizes `null`/`undefined` values by replacing them with an em dash character (`'—'`). When image URL fields like `photoURL` or `ImageUrl` were null/undefined, they were being replaced with `'—'` instead of a proper placeholder image URL. This caused the browser to attempt fetching images from invalid URLs like `http://localhost:8100/%E2%80%94`, resulting in 404 errors that froze the entire application.

**Error Logs:**
```
GET http://localhost:8100/%E2%80%94 404 (Not Found)
Image setProperty @ dom_renderer.mjs:652
```

**Solution:** Implemented a `sanitizeImageUrl()` helper method in both `UserService` and `RestaurantsService` that detects the em dash character and other invalid URL values, returning `null` instead. This allows components to properly fall back to their placeholder image logic.

**Files Modified:**
- `src/app/services/user.service.ts` - Added `sanitizeImageUrl()` helper and applied to `getUserProfile()` and `getAllUsers()` methods
- `src/app/services/restaurants.service.ts` - Added `sanitizeImageUrl()` helper and applied to all restaurant and menu item retrieval methods (`searchRestaurants()`, `searchRestaurantsWithFilters()`, `getRestaurantById()`, `getMenuItems()`, `getMenuItem()`)

**Prevention:** When working with image URLs from the backend API, always check for the em dash character (`'—'`) and treat it as a null/invalid value. Components should have proper placeholder image fallback logic.

---

**Document Version:** 1.5.2
**Last Updated:** 2025-12-02
**Changes:** Critical bug fix for app freezing after modal interactions due to em dash character in image URLs

**Changelog:**
- v1.5.2 (2025-12-02): **CRITICAL BUG FIX** - Fixed app freezing/crashing after opening any modal. The backend API was replacing null/undefined image URLs with em dash character ('—'), causing browser to attempt fetching from invalid URLs (http://localhost:8100/%E2%80%94) and resulting in 404 errors that froze the app. Added sanitizeImageUrl() helper method in UserService and RestaurantsService to detect and replace em dash with null, allowing proper placeholder fallback logic. Affected methods: getUserProfile(), getAllUsers(), searchRestaurants(), searchRestaurantsWithFilters(), getRestaurantById(), getMenuItems(), getMenuItem().
- v1.5.1 (2025-11-30): **CRITICAL BUG FIX** - Removed aggressive global margins on ion-router-outlet/ion-content/main/section elements that were preventing page content from displaying in web view (lines 241-254 in global.scss). Applied global green theme with purple-blue gradient accents to restaurant page, replacing all hardcoded colors (#ffffff, #000000, #FFD700) with theme CSS variables for consistent theming. Separated search page title from sticky search/filter section for improved UX - only search bar and filters are now sticky, title scrolls naturally with page content.
- v1.5.0 (2025-11-30): Fixed swiper card displacement and empty space issues in mobile/web views, integrated theme-aware brand images (App-Light.png/App-Dark.png) in header and login page, made search filters sticky below header, implemented individual filter tag removal with tags displayed next to filter buttons, completely redesigned restaurant page with hero section overlay, tab navigation (Overview/Review), structured info grid, payment methods display, collapsible opening hours, traditional vertical menu list, and review carousel
- v1.4.0 (2025-11-29): Implemented adaptive responsive layout system with mobile/web-specific layouts, documented API Vercel deployment, added 5 missing services to documentation (BookingService, ReviewsService, LocationService, ChatService, GeminiService), updated all pages with platform-aware layout classes, added comprehensive responsive layout guidelines
- v1.3 (2025-11-27): Centralized app state in AppComponent, refactored DataService to simple HTTP helper, removed individual page headers, dynamic restaurant titles, Gemini button moved to bottom-left and hidden when not logged in, added modern UI/UX utility classes
- v1.2 (2025-11-27): Added Socket.IO chat integration, Google Gemini AI assistant, enhanced DataService, UI/UX modernization
- v1.1 (2025-11-27): Updated loading states to use Eclipse.gif
- v1.0 (2025-11-26): Initial comprehensive documentation

