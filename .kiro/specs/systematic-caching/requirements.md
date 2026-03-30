# Requirements Document

## Introduction

The app currently has inconsistent caching across its Angular/Ionic services. Some services use
BehaviorSubject in-memory caches with no TTL, one uses a Map with a 5-minute TTL, and the PWA
service worker only covers static assets. This results in redundant HTTP calls on every page visit
(e.g. 4 fresh calls per restaurant page, getBatchStats() called twice on the home page).

This feature introduces systematic, TTL-based caching across all major data services, in-flight
request deduplication at the HTTP layer, localStorage persistence for the user profile, a merged
batch-stats call on the home page, and service-worker data groups for public read-only API
endpoints — collectively reducing network round-trips and improving perceived performance.

## Glossary

- **CacheEntry**: A typed object `{ data: T; timestamp: number }` held in a `Map` or `BehaviorSubject`.
- **TTL**: Time-to-live — the maximum age (in milliseconds) before a cached value is considered stale.
- **RestaurantsService**: Angular service responsible for restaurant and menu-item CRUD operations.
- **ReviewsService**: Angular service responsible for review CRUD, per-restaurant stats, and batch stats.
- **AdvertisementsService**: Angular service responsible for advertisement CRUD operations.
- **DataService**: Angular service that wraps `HttpClient` and is the single point of egress for all HTTP calls.
- **UserService**: Angular service responsible for user profile CRUD and local profile caching.
- **HomePage**: The Ionic page component that renders trending restaurants, nearby restaurants, ads, and reviews.
- **ServiceWorker**: The Angular PWA service worker configured via `ngsw-config.json`.
- **BatchStats**: A `Record<string, { totalReviews: number; averageRating: number }>` keyed by restaurant ID.
- **ReviewStats**: Per-restaurant aggregate `{ restaurantId, totalReviews, averageRating, ratingDistribution }`.
- **localStorage**: The browser's synchronous key-value storage used for lightweight profile persistence.

---

## Requirements

### Requirement 1: TTL Cache Helper

**User Story:** As a developer, I want a consistent TTL validation helper available in each service, so that cache freshness checks are uniform and not duplicated ad-hoc.

#### Acceptance Criteria

1. THE RestaurantsService SHALL expose a private `isCacheValid(timestamp: number, ttlMs: number): boolean` method that returns `true` when `Date.now() - timestamp < ttlMs`.
2. THE ReviewsService SHALL expose a private `isCacheValid(timestamp: number, ttlMs: number): boolean` method that returns `true` when `Date.now() - timestamp < ttlMs`.
3. THE AdvertisementsService SHALL expose a private `isCacheValid(timestamp: number, ttlMs: number): boolean` method that returns `true` when `Date.now() - timestamp < ttlMs`.
4. WHEN `isCacheValid` is called with a timestamp equal to `Date.now()`, THE helper SHALL return `true`.
5. WHEN `isCacheValid` is called with a timestamp older than `ttlMs` milliseconds, THE helper SHALL return `false`.

---

### Requirement 2: RestaurantsService — Single Restaurant TTL Cache

**User Story:** As a user, I want restaurant detail pages to load instantly on repeat visits within 10 minutes, so that I do not wait for redundant network calls.

#### Acceptance Criteria

1. THE RestaurantsService SHALL maintain a `Map<string, CacheEntry<Restaurant>>` for single-restaurant lookups with a TTL of 10 minutes (600 000 ms).
2. WHEN `getRestaurantById(id)` is called and a valid cache entry exists for `id`, THE RestaurantsService SHALL return the cached `Restaurant` without making an HTTP request.
3. WHEN `getRestaurantById(id)` is called and no valid cache entry exists for `id`, THE RestaurantsService SHALL fetch from the API and store the result with the current timestamp.
4. WHEN `updateRestaurant(id, payload)` completes successfully, THE RestaurantsService SHALL remove the cache entry for `id` from the single-restaurant cache.
5. WHEN `deleteRestaurant(id)` completes successfully, THE RestaurantsService SHALL remove the cache entry for `id` from the single-restaurant cache.
6. WHEN `uploadRestaurantImage(restaurantId, file, authToken)` completes successfully, THE RestaurantsService SHALL remove the cache entry for `restaurantId` from the single-restaurant cache.

---

### Requirement 3: RestaurantsService — Menu Items TTL Cache

**User Story:** As a user, I want menu items to load instantly on repeat visits within 10 minutes, so that the restaurant menu tab does not trigger redundant network calls.

#### Acceptance Criteria

1. THE RestaurantsService SHALL maintain a `Map<string, CacheEntry<MenuItem[]>>` for menu-item lookups keyed by `restaurantId` with a TTL of 10 minutes (600 000 ms).
2. WHEN `getMenuItems(restaurantId)` is called and a valid cache entry exists for `restaurantId`, THE RestaurantsService SHALL return the cached `MenuItem[]` without making an HTTP request.
3. WHEN `getMenuItems(restaurantId)` is called and no valid cache entry exists for `restaurantId`, THE RestaurantsService SHALL fetch from the API and store the result with the current timestamp.
4. WHEN `updateRestaurant(id, payload)` completes successfully, THE RestaurantsService SHALL remove the cache entry for `id` from the menu-items cache.
5. WHEN `deleteRestaurant(id)` completes successfully, THE RestaurantsService SHALL remove the cache entry for `id` from the menu-items cache.
6. WHEN `uploadRestaurantImage(restaurantId, file, authToken)` completes successfully, THE RestaurantsService SHALL remove the cache entry for `restaurantId` from the menu-items cache.

---

### Requirement 4: RestaurantsService — All-Restaurants List TTL

**User Story:** As a user, I want the full restaurant list to be served from cache within 10 minutes of the last fetch, so that repeated navigation does not trigger redundant list calls.

#### Acceptance Criteria

1. THE RestaurantsService SHALL maintain a `restaurantsCacheTimestamp: number` field initialised to `0`.
2. WHEN `getRestaurants()` is called and the existing `restaurantsCache` BehaviorSubject holds a non-null, non-empty value AND `isCacheValid(restaurantsCacheTimestamp, 600_000)` returns `true`, THE RestaurantsService SHALL return the cached list without making an HTTP request.
3. WHEN `getRestaurants()` fetches from the API successfully, THE RestaurantsService SHALL update `restaurantsCacheTimestamp` to `Date.now()`.
4. WHEN `createRestaurant`, `updateRestaurant`, `deleteRestaurant`, `uploadRestaurantImage`, or `claimRestaurant` completes successfully, THE RestaurantsService SHALL set `restaurantsCacheTimestamp` to `0` to force a fresh fetch on the next call.

---

### Requirement 5: ReviewsService — Reviews List TTL Cache

**User Story:** As a user, I want the reviews list for a restaurant to be served from cache within 5 minutes, so that switching tabs does not trigger redundant review fetches.

#### Acceptance Criteria

1. THE ReviewsService SHALL maintain a `Map<string, CacheEntry<Review[]>>` for review-list lookups keyed by `restaurantId` with a TTL of 5 minutes (300 000 ms).
2. WHEN `getReviews(restaurantId)` is called with a `restaurantId` and a valid cache entry exists, THE ReviewsService SHALL return the cached `Review[]` without making an HTTP request.
3. WHEN `getReviews(restaurantId)` is called with a `restaurantId` and no valid cache entry exists, THE ReviewsService SHALL fetch from the API and store the result with the current timestamp.
4. WHEN `getReviews` is called without a `restaurantId` (global list), THE ReviewsService SHALL bypass the cache and always fetch from the API.
5. WHEN `createReview`, `updateReview`, or `deleteReview` completes successfully for a given `restaurantId`, THE ReviewsService SHALL remove the cache entry for that `restaurantId` from the reviews-list cache.

---

### Requirement 6: ReviewsService — Restaurant Stats TTL Cache

**User Story:** As a user, I want per-restaurant review stats to be served from cache within 5 minutes, so that the stats widget does not re-fetch on every page visit.

#### Acceptance Criteria

1. THE ReviewsService SHALL maintain a `Map<string, CacheEntry<ReviewStats>>` for stats lookups keyed by `restaurantId` with a TTL of 5 minutes (300 000 ms).
2. WHEN `getRestaurantStats(restaurantId)` is called and a valid cache entry exists, THE ReviewsService SHALL return the cached `ReviewStats` without making an HTTP request.
3. WHEN `getRestaurantStats(restaurantId)` is called and no valid cache entry exists, THE ReviewsService SHALL fetch from the API and store the result with the current timestamp.
4. WHEN `createReview`, `updateReview`, or `deleteReview` completes successfully for a given `restaurantId`, THE ReviewsService SHALL remove the cache entry for that `restaurantId` from the stats cache.

---

### Requirement 7: ReviewsService — Batch Stats TTL Cache

**User Story:** As a developer, I want batch review stats to be cached for 5 minutes keyed by the sorted set of restaurant IDs, so that repeated calls with the same ID set do not hit the network.

#### Acceptance Criteria

1. THE ReviewsService SHALL maintain a `Map<string, CacheEntry<BatchStats>>` for batch-stats lookups keyed by the alphabetically sorted, comma-joined restaurant IDs with a TTL of 5 minutes (300 000 ms).
2. WHEN `getBatchStats(restaurantIds)` is called and a valid cache entry exists for the derived key, THE ReviewsService SHALL return the cached `BatchStats` without making an HTTP request.
3. WHEN `getBatchStats(restaurantIds)` is called and no valid cache entry exists, THE ReviewsService SHALL fetch from the API and store the result with the current timestamp.
4. WHEN `createReview`, `updateReview`, or `deleteReview` completes successfully, THE ReviewsService SHALL clear all entries from the batch-stats cache.

---

### Requirement 8: AdvertisementsService — BehaviorSubject TTL Cache

**User Story:** As a user, I want advertisements to be served from cache within 5 minutes, so that navigating back to the home page does not trigger a redundant ads fetch.

#### Acceptance Criteria

1. THE AdvertisementsService SHALL maintain a `BehaviorSubject<Advertisement[] | null>` initialised to `null` and an `adsCacheTimestamp: number` initialised to `0`.
2. WHEN `getAdvertisements()` is called without a `restaurantId` filter and the cache holds a non-null value AND `isCacheValid(adsCacheTimestamp, 300_000)` returns `true`, THE AdvertisementsService SHALL return the cached `Advertisement[]` without making an HTTP request.
3. WHEN `getAdvertisements()` fetches from the API successfully, THE AdvertisementsService SHALL update the BehaviorSubject and set `adsCacheTimestamp` to `Date.now()`.
4. WHEN `getAdvertisements(restaurantId)` is called with a `restaurantId` filter, THE AdvertisementsService SHALL bypass the cache and always fetch from the API.
5. WHEN `createAdvertisement`, `updateAdvertisement`, or `deleteAdvertisement` completes successfully, THE AdvertisementsService SHALL set the BehaviorSubject to `null` and `adsCacheTimestamp` to `0`.

---

### Requirement 9: DataService — In-Flight Request Deduplication

**User Story:** As a developer, I want concurrent identical GET requests to share a single in-flight HTTP call, so that components that subscribe simultaneously do not generate duplicate network requests.

#### Acceptance Criteria

1. THE DataService SHALL maintain a `Map<string, Observable<any>>` of in-flight GET requests keyed by the full request URL.
2. WHEN `get<T>(endpoint)` is called and an in-flight observable already exists for the same URL, THE DataService SHALL return the existing observable using `shareReplay(1)` rather than creating a new HTTP request.
3. WHEN `get<T>(endpoint)` is called and no in-flight observable exists for the URL, THE DataService SHALL create a new HTTP request observable with `shareReplay(1)` and store it in the map.
4. WHEN an in-flight GET observable completes or errors, THE DataService SHALL remove its entry from the in-flight map.
5. THE DataService SHALL NOT apply in-flight deduplication to `post`, `put`, `delete`, or `uploadFile` methods.

---

### Requirement 10: UserService — localStorage Profile Persistence

**User Story:** As a user, I want the navigation tabs to reflect my account type immediately on app launch, so that I do not see a flash of incorrect navigation items while the profile API call is in-flight.

#### Acceptance Criteria

1. THE UserService SHALL read `localStorage['userProfileCache']` on service initialisation and, if a valid JSON object is present, populate `currentProfileSubject` with the stored `{ type, restaurantId, displayName, photoURL }` fields immediately.
2. WHEN `getUserProfile(uid)` returns a successful response, THE UserService SHALL write `{ type, restaurantId, displayName, photoURL }` as a JSON string to `localStorage['userProfileCache']`.
3. WHEN `deleteUserProfile(uid)` completes successfully, THE UserService SHALL remove `localStorage['userProfileCache']`.
4. WHEN `clearAuthToken()` is called (auth logout), THE UserService SHALL remove `localStorage['userProfileCache']`.
5. IF reading or writing `localStorage` throws an exception (e.g. private browsing quota), THEN THE UserService SHALL catch the exception and continue operation without crashing.

---

### Requirement 11: HomePage — Merged Batch Stats Call

**User Story:** As a developer, I want the home page to issue a single `getBatchStats` call covering both trending and nearby restaurant IDs, so that the duplicate network call is eliminated.

#### Acceptance Criteria

1. THE HomePage SHALL compute a deduplicated union of trending restaurant IDs and nearby restaurant IDs before calling `getBatchStats`.
2. WHEN both the trending restaurant list and the nearby restaurant list are available, THE HomePage SHALL call `getBatchStats` exactly once with the combined, deduplicated ID array.
3. WHEN `getBatchStats` returns, THE HomePage SHALL populate `ratingMap` with the full result so that both the trending and nearby sections display correct ratings.
4. IF either the trending list or the nearby list is empty, THEN THE HomePage SHALL still call `getBatchStats` with the IDs from the non-empty list, provided at least one ID exists.

---

### Requirement 12: ServiceWorker — API Data Groups

**User Story:** As a user, I want public read-only API responses to be served stale-while-revalidating from the service worker cache, so that the app loads data instantly even on slow connections.

#### Acceptance Criteria

1. THE ServiceWorker SHALL cache responses from URLs matching `/API/Restaurants/**` using a `freshness` strategy with a maximum age of 10 minutes and a network timeout of 10 seconds.
2. THE ServiceWorker SHALL cache responses from URLs matching `/API/Advertisements/**` using a `freshness` strategy with a maximum age of 10 minutes and a network timeout of 10 seconds.
3. THE ServiceWorker SHALL cache responses from URLs matching `/API/Reviews/**` using a `freshness` strategy with a maximum age of 5 minutes and a network timeout of 10 seconds.
4. THE ServiceWorker SHALL store a maximum of 50 responses per data group to bound cache storage usage.
5. THE ServiceWorker SHALL NOT cache responses from mutation endpoints (POST, PUT, DELETE) — the `dataGroups` configuration applies to GET requests only by default.
