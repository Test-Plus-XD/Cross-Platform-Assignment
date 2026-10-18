# Project Timeline

This rough timeline was prepared from the commit history of:

- `C:\Users\Test-Plus\Projects\Cross Platform Assignment`
- `C:\Users\Test-Plus\Projects\Vercel-Express-API`

Date format: `DD/MM/YYYY - DD/MM/YYYY`.

The `Railway-Socket` repository was not inspected directly here. It is mentioned only where the two inspected repositories refer to Socket.IO being moved to Railway.

| No. | Date range | Progress |
| --- | --- | --- |
| 1 | 15/09/2025 - 25/09/2025 | The project began with early repository setup, simple test pages, `.gitignore` updates, Node.js files, and the first Ionic setup. This was the foundation stage before the application had a stable structure. |
| 2 | 02/10/2025 - 06/10/2025 | The first visible frontend features were added, including Home page test data, PWA setup, dark/light mode, and early Search, Restaurant, and User demo pages. |
| 3 | 08/10/2025 - 18/10/2025 | UI experimentation focused on Swiper, the proposal presentation files, header/footer layout, platform detection, responsive padding, side menu behaviour, and tab navigation. |
| 4 | 06/11/2025 - 13/11/2025 | Restaurant discovery and authentication started to become practical. Algolia, Leaflet, Ionic-native styling, login/register, OAuth, user data creation, menu routing, and Search/User page styling were added or improved. |
| 5 | 20/11/2025 - 24/11/2025 | Booking work began in the frontend, while the Vercel Express API repository was created and migrated into a deployable backend. Early API routes, Firebase setup, Algolia configuration, and Vercel deployment fixes were introduced. |
| 6 | 25/11/2025 - 26/11/2025 | The API was modularised into route files and gained Auth, Images, Gemini prompt updates, and documentation. Socket.IO real-time chat was added, then separated into a Railway-hosted socket service. |
| 7 | 27/11/2025 - 28/11/2025 | The frontend added booking, location, bookings page, store page, review service, centralised app state, Socket.IO chat integration, Gemini AI integration, and several Gemini display fixes. |
| 8 | 29/11/2025 - 30/11/2025 | Gemini chat handling was stabilised on the API side, including Chinese encoding fixes. The app added restaurant claiming, mobile UI improvements, adaptive responsive layouts, restaurant page redesign, and web content display fixes. |
| 9 | 01/12/2025 - 02/12/2025 | Search UI, payment data, theme integration, mobile UX, Swiper card positioning, Traditional Chinese search support, and a crash related to invalid image URLs were addressed. |
| 10 | 03/12/2025 - 04/12/2025 | User-type navigation, restaurant claiming, store restaurant loading, restaurant info editing, image upload, Railway socket URL configuration, booking type fixes, booking page redesign, and performance optimisation release v1.7.0 were completed. |
| 11 | 04/12/2025 - 08/12/2025 | Chat moved from partial functionality to a working user-facing feature, including auth tokens for room events, image storage, PhotoSwipe fixes, and chat UI refinements. DocuPipe bulk menu extraction also began. |
| 12 | 09/12/2025 - 13/12/2025 | Store menu management matured with bilingual menu item display, redesigned menu management, merged constants, review image support, real reviews on the Home page, and broader service/shared-component documentation. |
| 13 | 23/12/2025 - 29/01/2026 | Backend documentation and image storage conventions were cleaned up. Stripe payment routes and Checkout Sessions were added to the API, while the frontend added GPS nearby restaurants, dynamic placeholders, and Firebase Cloud Messaging support. |
| 14 | 12/02/2026 - 23/02/2026 | The map stack moved from Leaflet to Google Maps. Push notification prompting and Firebase Cloud Messaging integration were improved, including explicit service-worker registration for token retrieval. |
| 15 | 04/03/2026 - 06/03/2026 | Advertisement management with Stripe payment integration landed across the stack. The booking system was overhauled with dual ownership and new statuses, and the restaurant booking modal gained opening-hours awareness. |
| 16 | 07/03/2026 - 13/03/2026 | Continuous integration was added and repaired through GitHub workflow and Karma configuration changes. The API gained a nearby restaurant proximity endpoint and Users/API documentation updates. |
| 17 | 19/03/2026 - 21/03/2026 | AI-powered advertisement generation was added through Gemini. Restaurant info editing moved towards a standalone sub-page, and Search gained Google Maps view, Near Me search, directions, opening-status badges, star ratings, and review batch stats. |
| 18 | 25/03/2026 - 30/03/2026 | Home/Search card designs were unified, API proxy configuration was added, marker rendering and loading overlays were refined, systematic service caching was introduced, and the Store panel gained an Add New Restaurant modal. |
| 19 | 02/04/2026 - 06/04/2026 | QR code generation/scanning, Google One Tap, Angular `inject()` refactoring, server-side Gemini restaurant context, review rating auto-updates, and the new account-type selector modal were added. |
| 20 | 08/04/2026 - 10/04/2026 | Graph-based documentation, notification toasts, chat deep links, FCM backend registration, Messaging routes, QR scanning from uploaded images, rating/opening-hours fixes, and the native Android Capacitor project were introduced. |
| 21 | 12/04/2026 - 15/04/2026 | Android-specific work became a major focus: native Google Sign-In, deep-link handling, blank-page fixes, app shell refactoring, Capacitor/Gradle updates, contextual native sharing, sticky search header work, and chat preview/image improvements. |
| 22 | 16/04/2026 - 18/04/2026 | Chat gained participant avatars and better image handling. Push/chat behaviour was refactored for native and web platforms, onboarding and theming were improved, and Stripe deep-link return handling was hardened. |
| 23 | 19/04/2026 - 24/04/2026 | FCM token handling became platform-aware. Android data-only notifications, better backend notification logging, real-time chat room updates, auto-refresh, full menu modal support, and menu deep links were added. |
| 24 | 30/04/2026 - 02/05/2026 | Onboarding, restaurant information management, chat image lightbox sizing, QR scanner routing, profile creation, dark-mode Google Maps, menu item images, and menu image API hardening were refined. |
| 25 | 05/05/2026 - 07/05/2026 | The latest polish phase added Places Autocomplete, reverse geocoding, map pagination, glass-effect map popups, saved restaurants, articles/offers pages, modal layout improvements, payment/opening-hours display updates, menu image field standardisation, and booking datetime dark-mode fixes. |

## Summary

The project evolved from an Ionic frontend prototype into a full-stack restaurant discovery and booking platform. The largest development phases were:

- Frontend foundation and responsive UI work from September to November 2025.
- Backend/API separation and feature expansion from late November to December 2025.
- Maps, notifications, payments, advertisements, and booking maturity from January to March 2026.
- Android/Capacitor hardening, deep links, FCM, QR scanning, and final UX polish from April to May 2026.

The current history suggests that the project is no longer just a prototype. It has become a multi-platform application with separate REST, socket, AI, payment, notification, map, booking, and restaurant-management concerns.
