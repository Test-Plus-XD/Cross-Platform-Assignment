# Cross-Platform-Assignment
Used --legacy-peer-deps to install — for compatibility.
# Cross-Platform Restaurant Booking Application

## Project Overview

A full-stack, bilingual (English/Traditional Chinese) restaurant discovery and booking platform built with Angular/Ionic (frontend) and Express.js (backend). The application supports web browsers, iOS, and Android through Capacitor, featuring real-time search via Algolia, Firebase Authentication, and comprehensive booking management.

## Technology Stack

### Frontend
- **Framework:** Angular 20.3.3 with Ionic 8.7.9
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 4.1.14 + SCSS
- **Search:** Algolia 5.42.0
- **Maps:** Leaflet 1.9.4
- **Authentication:** Firebase Auth 12.5.0
- **Database:** Firestore 12.5.0
- **Native:** Capacitor 7.4.3

### Backend
- **Runtime:** Node.js with Express 5.1.0
- **Authentication:** Firebase Admin SDK 13.5.0
- **Search Indexing:** Algolia 5.44.0
- **AI Integration:** Google Gemini 2.5 (1.30.0)
- **Real-time Chat:** Socket.IO 4.8.1 (server and client)
- **File Upload:** Multer 2.0.2 (memory storage for serverless)
- **Deployment (REST API):** Vercel (https://vercel-express-api-alpha.vercel.app)
- **Deployment (Socket.IO):** Railway (https://railway-socket-production.up.railway.app)

## Core Features

- **Bilingual Interface:** Complete EN/TC language switching
- **Restaurant Search:** Algolia-powered full-text search with district/keyword filtering
- **Booking System:** Create, view, update, and cancel reservations with ownership verification
- **Review System:** User reviews with aggregate statistics per restaurant
- **Real-time Chat:** Socket.IO-powered live messaging between diners and restaurant owners
  - Dedicated chat button on restaurant pages for customer-owner communication (login required)
  - Real-time message delivery with typing indicators
  - Image upload support with Firebase Storage integration
  - Message history persistence and retrieval
- **AI Assistant:** Google Gemini-powered AI chatbot for general assistance
  - Global AI assistant button (bottom-left) available to all users without login
  - Restaurant-specific context awareness
  - Menu item recommendations and general dining queries
- **Authentication:** Email/password and Google OAuth via Firebase
- **Progressive Web App:** Offline support with service worker
- **Interactive Maps:** Leaflet-based restaurant location visualisation
- **Restaurant Claiming:** Restaurant owners can claim unclaimed restaurants to manage them
- **Dark Mode:** System preference detection with manual toggle
- **Responsive Design:** Adaptive layouts for mobile and web with automatic platform detection

## Installation

### Prerequisites
- Node.js (latest LTS)
- npm package manager
- Firebase project with Firestore and Authentication enabled
- Algolia account with search API credentials

### Setup
```bash
# Install dependencies (requires legacy peer deps flag)
npm install --legacy-peer-deps

# Install backend dependencies
cd API && npm install && cd ..

# Configure environment variables
# Create .env file in project root (see Backend Configuration below)

# Configure Firebase credentials
# Place serviceAccountKey.json in API/ directory
```

### Backend Configuration

Create `.env` file in project root:
```bash
# API Security
API_PASSCODE=your-api-passcode

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@project-id.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app

# Algolia
ALGOLIA_APP_ID=your-app-id
ALGOLIA_SEARCH_KEY=your-search-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Placeholder Image
PLACEHOLDER_IMAGE_URL=https://your-placeholder-url.com/image.jpg
```

### Frontend Configuration

Update `src/environments/environment.ts`:
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
  apiUrl: 'http://localhost:3000', // REST API (Vercel in production)
  socketUrl: 'http://localhost:3000', // Socket.IO server (Railway in production)
  algoliaAppId: 'YOUR_APP_ID',
  algoliaSearchKey: 'YOUR_SEARCH_KEY'
};
```

**Production Environment:**
- `apiUrl`: `https://vercel-express-api-alpha.vercel.app` (REST API on Vercel)
- `socketUrl`: `https://railway-socket-production.up.railway.app` (Socket.IO on Railway)

## Development

### Start Full Stack
```bash
npm run dev
# Frontend: http://localhost:4200
# Backend: http://localhost:3000
```

### Start Services Independently
```bash
# Frontend only (connects to production API by default)
npm start

# Backend only (if running locally - requires separate backend setup)
npm run start:api
```

**Note:** The application is configured to use the production API and Socket.IO servers by default. Local backend setup is optional and requires separate configuration.

### Build Commands
```bash
# Production build
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Architecture

### Frontend Structure
```
src/app/
├── pages/          # Feature modules (lazy-loaded)
├── services/       # Business logic (12 singleton services)
├── shared/         # Reusable components (header, footer, menu, tab)
└── app-routing.module.ts
```

### Backend Structure

**Note:** The backend is deployed externally and not included in this repository.

**REST API (Vercel):**
```
API/
├── index.ts        # Express application entry point
├── Firebase.ts     # Firebase Admin initialisation
├── shared.ts       # Authentication middleware & utilities
└── Routes/         # Domain-specific route handlers
    ├── Authentication.ts
    ├── Restaurants.ts
    ├── Users.ts
    ├── Bookings.ts
    ├── Reviews.ts
    ├── Images.ts
    ├── Algolia.ts
    ├── Gemini.ts
    └── Chat.ts (HTTP endpoints for chat room management)
```

**Socket.IO Server (Railway):**
- Dedicated WebSocket server for real-time chat functionality
- Handles room management, message broadcasting, typing indicators
- Independent deployment from REST API for scalability

### Data Flow
```
Component → Service → DataService (HTTP) → API → Firebase/Algolia → Response
```

### Security Model
- **API Passcode:** Header `x-api-passcode: **Passcode**` required for all endpoints
- **JWT Authentication:** Firebase ID token via `Authorization: Bearer <token>` for protected routes
- **Ownership Verification:** Users can only access/modify their own resources
- **Role-based Access:** Separate permissions for customers and restaurant owners

## API Documentation

### Base URL
- **Development:** `http://localhost:3000`
- **Production:** Configure in environment files

### Authentication Endpoints
- `POST /API/Auth/register` - Email/password registration
- `POST /API/Auth/login` - Email/password login
- `POST /API/Auth/google` - Google OAuth authentication
- `POST /API/Auth/verify` - Token verification
- `POST /API/Auth/reset-password` - Password reset email
- `POST /API/Auth/logout` - Token revocation
- `DELETE /API/Auth/delete-account` - Account deletion

### Restaurant Endpoints
- `GET /API/Restaurants` - List all restaurants
- `GET /API/Restaurants/:id` - Retrieve single restaurant
- `POST /API/Restaurants` - Create restaurant
- `PUT /API/Restaurants/:id` - Update restaurant
- `DELETE /API/Restaurants/:id` - Delete restaurant
- `POST /API/Restaurants/:id/image` - Upload restaurant image

### Menu Sub-collection
- `GET /API/Restaurants/:restaurantId/menu` - List menu items
- `GET /API/Restaurants/:restaurantId/menu/:menuItemId` - Retrieve menu item
- `POST /API/Restaurants/:restaurantId/menu` - Create menu item
- `PUT /API/Restaurants/:restaurantId/menu/:menuItemId` - Update menu item
- `DELETE /API/Restaurants/:restaurantId/menu/:menuItemId` - Delete menu item

### Booking Endpoints (Protected)
- `GET /API/Bookings` - List user's bookings (filtered by userId)
- `GET /API/Bookings/:id` - Retrieve single booking
- `POST /API/Bookings` - Create booking
- `PUT /API/Bookings/:id` - Update booking
- `DELETE /API/Bookings/:id` - Delete booking

### Review Endpoints
- `GET /API/Reviews` - List reviews (filterable by restaurantId/userId)
- `GET /API/Reviews/:id` - Retrieve single review
- `POST /API/Reviews` - Create review (Protected)
- `PUT /API/Reviews/:id` - Update review (Protected, ownership verified)
- `DELETE /API/Reviews/:id` - Delete review (Protected, ownership verified)
- `GET /API/Reviews/Restaurant/:restaurantId/stats` - Review statistics

### Image Endpoints
- `POST /API/Images/upload` - Upload image to Firebase Storage (Protected)
- `DELETE /API/Images/delete` - Delete image from Storage (Protected)
- `GET /API/Images/metadata` - Retrieve image metadata

### Search Endpoints
- `GET /API/Algolia/Restaurants` - Search restaurants with filters
- `GET /API/Algolia/Restaurants/facets/:facetName` - Retrieve facet values
- `POST /API/Algolia/Restaurants/advanced` - Advanced search with custom filters

### AI Endpoints
- `POST /API/Gemini/generate` - Generate text content
- `POST /API/Gemini/chat` - Chat with AI (conversation history supported)
- `POST /API/Gemini/restaurant-description` - Generate restaurant descriptions

### Chat Endpoints (Protected)
- `GET /API/Chat/Rooms` - List user's chat rooms
- `GET /API/Chat/Rooms/:roomId` - Retrieve chat room
- `POST /API/Chat/Rooms` - Create chat room
- `GET /API/Chat/Rooms/:roomId/Messages` - List messages (paginated)
- `POST /API/Chat/Rooms/:roomId/Messages` - Send message
- `PUT /API/Chat/Rooms/:roomId/Messages/:messageId` - Edit message
- `DELETE /API/Chat/Rooms/:roomId/Messages/:messageId` - Delete message (soft delete)
- `GET /API/Chat/Stats` - Retrieve chat statistics

## Native Deployment

### iOS
```bash
npx cap sync ios
npx cap open ios
# Build in Xcode → Archive → Distribute to App Store
```

### Android
```bash
npx cap sync android
npx cap open android
# Build in Android Studio → Generate Signed APK/AAB
```

## Testing
```bash
# Run unit tests
npm test

# Generate coverage report
npm test -- --code-coverage
```

## Documentation

- **`CLAUDE.md` (Frontend):** Comprehensive frontend architecture guide
- **`CLAUDE.md` (Backend - API/):** Complete backend API documentation
- **`API.md` (Backend):** Detailed API endpoint reference

## Known Issues

- Package installation requires `--legacy-peer-deps` flag due to peer dependency conflicts
- Service worker caching may require manual cache clearing during development

## Licence

This project is an academic assignment. All rights reserved.

## Contributors

Developed as part of university coursework in cross-platform application development.