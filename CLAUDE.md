# CLAUDE.md - AI Assistant Guide for Cross-Platform-Assignment

> **Last Updated:** 2025-11-27
> **Project Version:** 1.0.0
> **Angular Version:** 20.3.3
> **Ionic Version:** 8.7.9

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

**Cross-Platform-Assignment** is a full-stack restaurant discovery and booking application built with Angular/Ionic for the frontend and Node.js/Express for the backend. The application supports:

- **Multi-platform deployment:** Web (PWA), iOS, and Android via Capacitor
- **Bilingual support:** English and Traditional Chinese (EN/TC)
- **Restaurant search:** Powered by Algolia with district and keyword filtering
- **User authentication:** Firebase Auth with Google OAuth
- **Booking management:** Create, view, and manage restaurant reservations
- **Interactive maps:** Leaflet integration for restaurant locations
- **Theming:** Light/dark mode with system preference detection

**Key Features:**
- Progressive Web App (PWA) with service worker
- Real-time data sync via Firebase Firestore
- Responsive design with Ionic components
- Lazy-loaded routes for optimal performance
- JWT-based API authentication

---

## Codebase Structure

```
Cross-Platform-Assignment/
├── src/                          # Frontend source code
│   ├── app/
│   │   ├── pages/               # Feature modules (lazy-loaded)
│   │   │   ├── home/           # Home page with featured content
│   │   │   ├── search/         # Restaurant search with Algolia
│   │   │   ├── restaurant/     # Restaurant detail view + map
│   │   │   ├── user/           # User profile (auth-protected)
│   │   │   ├── login/          # Authentication page
│   │   │   └── test/           # Testing/development page
│   │   ├── services/           # Core business logic (12 services)
│   │   │   ├── auth.service.ts           # Firebase authentication
│   │   │   ├── restaurants.service.ts    # Restaurant CRUD
│   │   │   ├── user.service.ts           # User profile management
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
│   │   │   └── tab/            # Tab navigation
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
├── API/                         # Backend REST API
│   ├── API.js                  # Express server (528 lines)
│   ├── package.json            # Backend dependencies
│   └── serviceAccountKey.json  # Firebase Admin credentials
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

### Backend
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | - | JavaScript runtime |
| **Framework** | Express | 5.1.0 | REST API server |
| **Auth** | Firebase Admin | 13.5.0 | JWT verification |
| **Middleware** | CORS | 2.8.5 | Cross-origin requests |
| **Module System** | ES Modules | - | `import`/`export` syntax |

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

---

## API Documentation

### Base URL
- **Development:** `http://localhost:3000`
- **Production:** Configure in `src/environments/environment.prod.ts`

### Authentication
Protected endpoints require a Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase-id-token>
```

### Endpoints

#### Restaurants (Public)
| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|--------------|----------|
| **GET** | `/API/Restaurants` | ❌ No | - | `{ count: number, data: Restaurant[] }` |
| **GET** | `/API/Restaurants/:id` | ❌ No | - | `Restaurant` |
| **POST** | `/API/Restaurants` | ❌ No | `{ Name_EN?, Name_TC?, Address_EN?, ... }` | `{ id: string }` |
| **PUT** | `/API/Restaurants/:id` | ❌ No | `{ Name_EN?, ... }` | `204 No Content` |
| **DELETE** | `/API/Restaurants/:id` | ❌ No | - | `204 No Content` |

**Required Fields for POST:**
- At least one of: `Name_EN` or `Name_TC`

#### Users (Protected)
| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|--------------|----------|
| **GET** | `/API/Users` | ❌ No | - | `{ count: number, data: User[] }` |
| **GET** | `/API/Users/:uid` | ❌ No | - | `User` |
| **POST** | `/API/Users` | ✅ Yes | `{ uid, email?, displayName?, ... }` | `{ id: string }` |
| **PUT** | `/API/Users/:uid` | ✅ Yes | `{ displayName?, preferences?, ... }` | `204 No Content` |
| **DELETE** | `/API/Users/:uid` | ✅ Yes | - | `204 No Content` |

**Security:**
- Users can only create/update/delete their own profile
- `uid` must match authenticated user's UID

#### Bookings (Protected)
| Method | Endpoint | Auth | Request Body | Response |
|--------|----------|------|--------------|----------|
| **GET** | `/API/Bookings?userId=<uid>` | ✅ Yes | - | `{ count: number, data: Booking[] }` |
| **GET** | `/API/Bookings/:id` | ✅ Yes | - | `Booking` |
| **POST** | `/API/Bookings` | ✅ Yes | `{ restaurantId, dateTime, numberOfGuests }` | `{ id: string }` |
| **PUT** | `/API/Bookings/:id` | ✅ Yes | `{ status?, numberOfGuests?, ... }` | `204 No Content` |
| **DELETE** | `/API/Bookings/:id` | ✅ Yes | - | `204 No Content` |

**Required Fields for POST:**
- `restaurantId` (string)
- `dateTime` (timestamp)
- `numberOfGuests` (number)

**Security:**
- Users can only view/create/update/delete their own bookings
- `userId` automatically set to authenticated user's UID
- Query parameter filtering enforced: cannot view other users' bookings

### Error Responses
```json
{
  "error": "Human-readable error message"
}
```

**Common Status Codes:**
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (ownership violation)
- `404` - Not Found
- `409` - Conflict (e.g., user already exists)
- `500` - Internal Server Error

### Data Sanitization
- All responses sanitize `null`/`undefined` values to `'—'`
- Missing `ImageUrl` replaced with placeholder path
- Recursive sanitization for nested objects and arrays

---

## Data Models

### Firestore Collections

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

### 8. DataService (`data.service.ts`)
**Purpose:** HTTP client wrapper
**Key Methods:**
- `get<T>(endpoint)` - GET request
- `post<T>(endpoint, body)` - POST request
- `put<T>(endpoint, body)` - PUT request
- `delete<T>(endpoint)` - DELETE request

**Features:**
- Auto-attaches auth token
- Base URL from environment config
- Error handling with catchError

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
