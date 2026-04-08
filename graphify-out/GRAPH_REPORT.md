# Graph Report - src/  (2026-04-08)

## Corpus Check
- 112 files · ~130,147 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 951 nodes · 1347 edges · 78 communities detected
- Extraction: 80% EXTRACTED · 20% INFERRED · 0% AMBIGUOUS · INFERRED: 265 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `RestaurantPage` - 47 edges
2. `SearchPage` - 40 edges
3. `StorePage` - 38 edges
4. `BookingPage` - 26 edges
5. `ChatButtonComponent` - 25 edges
6. `UserPage` - 24 edges
7. `RestaurantInfoModalComponent` - 23 edges
8. `RestaurantsService` - 22 edges
9. `AddRestaurantModalComponent` - 21 edges
10. `BookingService` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Amplifier Megaphone Icon` --references--> `AdvertisementsService`  [INFERRED]
  src/assets/icon/Amplifier.png → src/app/services/advertisements.service.ts
- `Restaurant Food Placeholder Image` --references--> `RestaurantsService`  [INFERRED]
  src/assets/icon/Placeholder.png → src/app/services/restaurants.service.ts
- `Leaflet Map Marker Icon` --references--> `MapModalComponent`  [INFERRED]
  src/assets/leaflet/marker-icon.png → src/app/pages/restaurant/map-modal.component.ts
- `Eclipse Loading Spinner GIF` --references--> `UIService`  [INFERRED]
  src/assets/icon/Eclipse.gif → src/app/services/UI.service.ts
- `PourRice App Logo Dark Theme` --references--> `HeaderComponent`  [INFERRED]
  src/assets/icon/App-Dark.png → src/app/shared/header/header.component.ts

## Hyperedges (group relationships)
- **RestaurantPage Modal Components** — restaurant_restaurantpage, restaurant_bookingmodal, restaurant_mapmodal, restaurant_menumodal [EXTRACTED 1.00]
- **HomePage Data Service Dependencies** — home_homepage, services_restaurantsservice, services_reviewsservice, services_advertisementsservice, services_locationservice, services_mockdataservice [EXTRACTED 1.00]
- **Shared Opening Hours Logic** — home_homepage, search_searchpage, restaurant_bookingmodal [INFERRED 0.85]
- **Store Modals Using StoreFeatureService** — store_addrestaurantmodal, store_bulkmenuimportmodal, store_menuitemmodal, store_restaurantinfomodal, store_storepage [EXTRACTED 1.00]
- **Services Depending on AuthService** — svc_advertisements, svc_appstate, svc_booking, svc_chat, svc_auth [EXTRACTED 1.00]
- **StoreFeatureService Aggregates Core Services** — services_storefeatureservice, services_restaurantsservice2, services_bookingservice, services_userservice2 [EXTRACTED 1.00]
- **RestaurantFeatureService Aggregates Core Services** — services_restaurantfeatureservice2, services_restaurantsservice2, services_reviewsservice2, services_locationservice2, services_bookingservice [EXTRACTED 1.00]
- **GeminiService Calls Multiple Gemini API Endpoints** — services_geminiservice, api_gemini_chat, api_gemini_generate, api_gemini_restaurant_description, api_gemini_restaurant_advertisement [EXTRACTED 1.00]
- **Shared Navigation Components** — menu_menucomponent, tab_tabcomponent, header_headercomponent [EXTRACTED 1.00]
- **QrScannerModal Cross-Platform Barcode Strategy** — qrscanner_qrscannermodalcomponent, ext_capacitormlkit, ext_barcodedetectorapi [EXTRACTED 1.00]
- **Environment Configs Reference External Services** — env_environment, env_environmentprod, ext_firebase, ext_algolia, ext_socketio, ext_googlemaps, ext_vercelapi [EXTRACTED 1.00]

## Communities

### Community 0 - "Angular App Core"
Cohesion: 0.04
Nodes (23): AccountTypeSelectorComponent, AppModule, BookingPageModule, BookingPageRoutingModule, ChatPageModule, ChatPageRoutingModule, HomePageModule, HomePageRoutingModule (+15 more)

### Community 1 - "Shared Components & API Interfaces"
Cohesion: 0.05
Nodes (49): GET /API/Restaurants/nearby, GET /API/Reviews/batch-stats, pourrice://menu Deep Link Scheme, Browser BarcodeDetector API, Capacitor MLKit Barcode Scanning, FooterComponent, HeaderComponent, Amplifier Megaphone Icon (+41 more)

### Community 2 - "Restaurant Detail Page"
Cohesion: 0.06
Nodes (1): RestaurantPage

### Community 3 - "Search & Map Page"
Cohesion: 0.09
Nodes (1): SearchPage

### Community 4 - "Store Admin Page"
Cohesion: 0.07
Nodes (1): StorePage

### Community 5 - "Constants & Store Helpers"
Cohesion: 0.07
Nodes (1): StoreHelpersService

### Community 6 - "Booking Management"
Cohesion: 0.09
Nodes (1): BookingPage

### Community 7 - "Chat Button Component"
Cohesion: 0.13
Nodes (1): ChatButtonComponent

### Community 8 - "User Profile Page"
Cohesion: 0.12
Nodes (1): UserPage

### Community 9 - "Page-Service Integration"
Cohesion: 0.11
Nodes (24): ChatPage, Districts Constants, Keywords Constants, HomePage, Leaflet Map Marker Icon, LoginPage, BookingModalComponent, MapModalComponent (+16 more)

### Community 10 - "Restaurant Edit Modal"
Cohesion: 0.13
Nodes (1): RestaurantInfoModalComponent

### Community 11 - "Restaurants Service"
Cohesion: 0.1
Nodes (1): RestaurantsService

### Community 12 - "Add Restaurant Modal"
Cohesion: 0.12
Nodes (1): AddRestaurantModalComponent

### Community 13 - "Booking Service"
Cohesion: 0.15
Nodes (1): BookingService

### Community 14 - "Home Page"
Cohesion: 0.13
Nodes (1): HomePage

### Community 15 - "Push Notifications Service"
Cohesion: 0.14
Nodes (1): MessagingService

### Community 16 - "User Service"
Cohesion: 0.16
Nodes (1): UserService

### Community 17 - "Auth Service"
Cohesion: 0.18
Nodes (1): AuthService

### Community 18 - "Location & Distance"
Cohesion: 0.15
Nodes (1): LocationService

### Community 19 - "Platform Detection"
Cohesion: 0.23
Nodes (1): PlatformService

### Community 20 - "Gemini AI Button"
Cohesion: 0.18
Nodes (1): GeminiButtonComponent

### Community 21 - "Login & Auth Flow"
Cohesion: 0.27
Nodes (1): LoginPage

### Community 22 - "Bulk Menu Import Modal"
Cohesion: 0.2
Nodes (1): BulkMenuImportModalComponent

### Community 23 - "Chat Page"
Cohesion: 0.2
Nodes (1): ChatPage

### Community 24 - "Profile Modal"
Cohesion: 0.2
Nodes (1): ProfileModalComponent

### Community 25 - "Restaurant Constants"
Cohesion: 0.15
Nodes (0): 

### Community 26 - "Socket.IO Chat Service"
Cohesion: 0.17
Nodes (1): ChatService

### Community 27 - "Gemini AI Service"
Cohesion: 0.21
Nodes (1): GeminiService

### Community 28 - "Reviews Service"
Cohesion: 0.23
Nodes (1): ReviewsService

### Community 29 - "Menu Item Modal"
Cohesion: 0.21
Nodes (1): MenuItemModalComponent

### Community 30 - "QR Scanner Modal"
Cohesion: 0.3
Nodes (1): QrScannerModalComponent

### Community 31 - "Gemini API Endpoints"
Cohesion: 0.18
Nodes (11): POST /API/Gemini/chat, POST /API/Gemini/generate, POST /API/Gemini/restaurant-advertisement, POST /API/Gemini/restaurant-description, POST /API/Images/upload, GeminiButtonComponent, AdvertisementGenerationResponse Interface, ChatHistoryEntry Interface (+3 more)

### Community 32 - "Map Directions Modal"
Cohesion: 0.31
Nodes (1): MapModalComponent

### Community 33 - "Header Component"
Cohesion: 0.2
Nodes (1): HeaderComponent

### Community 34 - "Booking Modal"
Cohesion: 0.31
Nodes (1): BookingModalComponent

### Community 35 - "Ad Creation Modal"
Cohesion: 0.28
Nodes (1): AdModalComponent

### Community 36 - "Advertisements Service"
Cohesion: 0.33
Nodes (1): AdvertisementsService

### Community 37 - "HTTP Data Service"
Cohesion: 0.36
Nodes (1): DataService

### Community 38 - "Menu QR Generator Modal"
Cohesion: 0.29
Nodes (1): MenuQrModalComponent

### Community 39 - "Chat API Service"
Cohesion: 0.39
Nodes (1): ChatApiService

### Community 40 - "UI Utilities Service"
Cohesion: 0.29
Nodes (1): UIService

### Community 41 - "Root App Component"
Cohesion: 0.38
Nodes (1): AppComponent

### Community 42 - "Mock Data Service"
Cohesion: 0.29
Nodes (1): MockDataService

### Community 43 - "App State Service"
Cohesion: 0.33
Nodes (1): AppStateService

### Community 44 - "Side Menu Component"
Cohesion: 0.29
Nodes (1): MenuComponent

### Community 45 - "Environment Config"
Cohesion: 0.29
Nodes (7): Environment (Dev), Environment (Prod), Algolia Search, Firebase / Firestore, Google Maps API, Socket.IO (Railway), Vercel REST API

### Community 46 - "Chat Visibility Service"
Cohesion: 0.33
Nodes (1): ChatVisibilityService

### Community 47 - "Language Service"
Cohesion: 0.47
Nodes (1): LanguageService

### Community 48 - "Theme Service"
Cohesion: 0.4
Nodes (1): ThemeService

### Community 49 - "Footer Component"
Cohesion: 0.47
Nodes (1): FooterComponent

### Community 50 - "App Routing Module"
Cohesion: 0.4
Nodes (2): AppRoutingModule, AuthGuard

### Community 51 - "Layout Service"
Cohesion: 0.4
Nodes (1): LayoutService

### Community 52 - "Swiper Carousel"
Cohesion: 0.5
Nodes (1): SwiperDirective

### Community 53 - "Loading & Layout Assets"
Cohesion: 0.67
Nodes (3): Eclipse Loading Spinner GIF, LayoutService, UIService

### Community 54 - "Polyfills & Zone Config"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Notification Interfaces"
Cohesion: 1.0
Nodes (2): NotificationPayload Interface, MessagingService

### Community 56 - "Firebase Service Worker"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Test Harness"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Type Declarations"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Constants Index"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "NGSW Config"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Algolia Search Script"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "UI Utilities Script"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Prod Environment"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Chat Button (Semantic)"
Cohesion: 1.0
Nodes (1): ChatButtonComponent

### Community 65 - "Chat Visibility (Semantic)"
Cohesion: 1.0
Nodes (1): ChatVisibilityService

### Community 66 - "AppState Interface"
Cohesion: 1.0
Nodes (1): AppState Interface

### Community 67 - "Advertisement Interface"
Cohesion: 1.0
Nodes (1): Advertisement Interface

### Community 68 - "Booking Interface"
Cohesion: 1.0
Nodes (1): Booking Interface

### Community 69 - "Chat Message Interface"
Cohesion: 1.0
Nodes (1): ChatMessage Interface

### Community 70 - "User Interface"
Cohesion: 1.0
Nodes (1): User Interface

### Community 71 - "Shared Module"
Cohesion: 1.0
Nodes (1): SharedModule

### Community 72 - "User Avatar Asset"
Cohesion: 1.0
Nodes (1): User Page Icon

### Community 73 - "Background Shapes SVG"
Cohesion: 1.0
Nodes (1): Shapes SVG Background

### Community 74 - "App Store Badge"
Cohesion: 1.0
Nodes (1): Download on the App Store Badge

### Community 75 - "App Favicon"
Cohesion: 1.0
Nodes (1): App Favicon

### Community 76 - "Google Play Badge"
Cohesion: 1.0
Nodes (1): Get It on Google Play Badge

### Community 77 - "Leaflet Map Shadow"
Cohesion: 1.0
Nodes (1): Leaflet Map Marker Shadow

## Knowledge Gaps
- **80 isolated node(s):** `AppRoutingModule`, `AppModule`, `BookingPageRoutingModule`, `BookingPageModule`, `ChatPageRoutingModule` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Polyfills & Zone Config`** (2 nodes): `polyfills.ts`, `zone-flags.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Notification Interfaces`** (2 nodes): `NotificationPayload Interface`, `MessagingService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Firebase Service Worker`** (1 nodes): `firebase-messaging-sw.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Harness`** (1 nodes): `test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Type Declarations`** (1 nodes): `typings.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Constants Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `NGSW Config`** (1 nodes): `ngsw-config.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Algolia Search Script`** (1 nodes): `Algolia.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Utilities Script`** (1 nodes): `UI.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prod Environment`** (1 nodes): `environment.prod.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chat Button (Semantic)`** (1 nodes): `ChatButtonComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chat Visibility (Semantic)`** (1 nodes): `ChatVisibilityService`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AppState Interface`** (1 nodes): `AppState Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Advertisement Interface`** (1 nodes): `Advertisement Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Booking Interface`** (1 nodes): `Booking Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Chat Message Interface`** (1 nodes): `ChatMessage Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User Interface`** (1 nodes): `User Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Module`** (1 nodes): `SharedModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User Avatar Asset`** (1 nodes): `User Page Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Background Shapes SVG`** (1 nodes): `Shapes SVG Background`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Store Badge`** (1 nodes): `Download on the App Store Badge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Favicon`** (1 nodes): `App Favicon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Google Play Badge`** (1 nodes): `Get It on Google Play Badge`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Leaflet Map Shadow`** (1 nodes): `Leaflet Map Marker Shadow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `RestaurantPage` connect `Restaurant Detail Page` to `Angular App Core`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `SearchPage` connect `Search & Map Page` to `Angular App Core`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `StorePage` connect `Store Admin Page` to `Angular App Core`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **What connects `AppRoutingModule`, `AppModule`, `BookingPageRoutingModule` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Angular App Core` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Shared Components & API Interfaces` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Restaurant Detail Page` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._