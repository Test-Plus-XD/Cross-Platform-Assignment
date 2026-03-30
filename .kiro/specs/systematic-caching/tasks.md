# Implementation Plan: Systematic Caching

## Overview

Introduce TTL-based in-memory caches, in-flight request deduplication, localStorage profile
persistence, a merged batch-stats call, and service-worker data groups across the Angular/Ionic
app to eliminate redundant HTTP calls and improve perceived performance.

## Tasks

- [x] 1. Add `isCacheValid` helper and TTL cache fields to `RestaurantsService`
  - Add `CacheEntry<T>` interface, `restaurantCache`, `menuCache`, and `restaurantsCacheTimestamp` fields
  - Implement private `isCacheValid(timestamp: number, ttlMs: number): boolean` method
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [ ]* 1.1 Write property test for `isCacheValid` correctness (Property 1)
    - **Property 1: isCacheValid correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
    - Use `fc.integer()` and `fc.nat()` arbitraries; assert `Date.now() - t < ttlMs` iff returns `true`

- [x] 2. Implement single-restaurant TTL cache in `RestaurantsService`
  - In `getRestaurantById(id)`: check `restaurantCache` with `isCacheValid`; return cached value or fetch and store
  - In `updateRestaurant`, `deleteRestaurant`, `uploadRestaurantImage`: call `restaurantCache.delete(id)` on success
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.1 Write property test for cache hit avoids HTTP (Property 2 — restaurant)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 2.2**
    - Use `fc.string()` for IDs; seed cache entry, call `getRestaurantById` twice, assert one HTTP call

  - [ ]* 2.2 Write property test for cache miss round-trip (Property 3 — restaurant)
    - **Property 3: Cache miss fetches and stores**
    - **Validates: Requirements 2.3**
    - Use `fc.string()` for IDs; assert second call within TTL returns cached value without new HTTP call

  - [ ]* 2.3 Write property test for mutation invalidates cache (Property 4 — restaurant)
    - **Property 4: Mutation invalidates targeted cache entry**
    - **Validates: Requirements 2.4, 2.5, 2.6**
    - Use `fc.string()` for IDs; after mutation, assert next `getRestaurantById` triggers HTTP call

- [x] 3. Implement menu-items TTL cache in `RestaurantsService`
  - In `getMenuItems(restaurantId)`: check `menuCache` with `isCacheValid`; return cached value or fetch and store
  - In `updateRestaurant`, `deleteRestaurant`, `uploadRestaurantImage`: call `menuCache.delete(id)` on success
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 3.1 Write property test for cache hit avoids HTTP (Property 2 — menu)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 3.2**
    - Use `fc.string()` for restaurant IDs; seed menu cache, assert second call returns cached value

  - [ ]* 3.2 Write property test for mutation invalidates menu cache (Property 4 — menu)
    - **Property 4: Mutation invalidates targeted cache entry**
    - **Validates: Requirements 3.4, 3.5, 3.6**
    - After `updateRestaurant`/`deleteRestaurant`/`uploadRestaurantImage`, assert menu cache entry removed

- [x] 4. Implement all-restaurants list TTL in `RestaurantsService`
  - Add `restaurantsCacheTimestamp = 0` field
  - In `getRestaurants()`: guard with `isCacheValid(restaurantsCacheTimestamp, 600_000)` before returning BehaviorSubject value
  - On successful fetch: set `restaurantsCacheTimestamp = Date.now()`
  - In `createRestaurant`, `updateRestaurant`, `deleteRestaurant`, `uploadRestaurantImage`, `claimRestaurant`: set `restaurantsCacheTimestamp = 0`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 4.1 Write property test for list cache hit avoids HTTP (Property 2 — list)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 4.2**
    - Seed BehaviorSubject and timestamp; assert `getRestaurants()` returns cached list without HTTP call

- [x] 5. Checkpoint — Ensure all `RestaurantsService` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add `isCacheValid` helper and TTL cache fields to `ReviewsService`
  - Add `CacheEntry<T>` interface, `reviewsCache`, `statsCache`, and `batchStatsCache` Map fields
  - Implement private `isCacheValid(timestamp: number, ttlMs: number): boolean` method
  - _Requirements: 1.2, 5.1, 6.1, 7.1_

- [x] 7. Implement reviews-list TTL cache in `ReviewsService`
  - In `getReviews(restaurantId)`: when `restaurantId` is provided, check `reviewsCache`; return cached or fetch and store
  - When `restaurantId` is absent, bypass cache and always fetch
  - In `createReview`, `updateReview`, `deleteReview`: call `reviewsCache.delete(restaurantId)` on success
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.1 Write property test for cache hit avoids HTTP (Property 2 — reviews)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 5.2**
    - Use `fc.string()` for restaurant IDs; seed reviews cache, assert second call returns cached value

  - [ ]* 7.2 Write property test for filtered calls bypass cache (Property 6 — reviews)
    - **Property 6: Filtered and global-list calls bypass cache**
    - **Validates: Requirements 5.4**
    - Use `fc.string()` for IDs; call `getReviews()` without `restaurantId`, assert HTTP call always made

- [x] 8. Implement restaurant-stats TTL cache in `ReviewsService`
  - In `getRestaurantStats(restaurantId)`: check `statsCache` with `isCacheValid`; return cached or fetch and store
  - In `createReview`, `updateReview`, `deleteReview`: call `statsCache.delete(restaurantId)` on success
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 8.1 Write property test for stats cache hit avoids HTTP (Property 2 — stats)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 6.2**
    - Use `fc.string()` for IDs; seed stats cache, assert second call returns cached value

- [x] 9. Implement batch-stats TTL cache in `ReviewsService`
  - In `getBatchStats(restaurantIds)`: derive key as `restaurantIds.slice().sort().join(',')`; check `batchStatsCache`; return cached or fetch and store
  - In `createReview`, `updateReview`, `deleteReview`: call `batchStatsCache.clear()` on success
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.1 Write property test for batch-stats cache hit avoids HTTP (Property 2 — batch)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 7.2**
    - Use `fc.array(fc.string())` for ID arrays; seed batch cache, assert second call returns cached value

  - [ ]* 9.2 Write property test for review mutation clears batch-stats cache (Property 5)
    - **Property 5: Review mutation clears entire batch-stats cache**
    - **Validates: Requirements 7.4**
    - Use `fc.array(fc.string())` to seed multiple batch entries; after mutation, assert `batchStatsCache.size === 0`

- [x] 10. Checkpoint — Ensure all `ReviewsService` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Add `isCacheValid` helper and TTL cache fields to `AdvertisementsService`
  - Add `adsCache: BehaviorSubject<Advertisement[] | null>` initialised to `null` and `adsCacheTimestamp = 0`
  - Implement private `isCacheValid(timestamp: number, ttlMs: number): boolean` method
  - _Requirements: 1.3, 8.1_

- [x] 12. Implement BehaviorSubject TTL cache in `AdvertisementsService`
  - In `getAdvertisements()` without `restaurantId`: check `isCacheValid(adsCacheTimestamp, 300_000)` and BehaviorSubject value; return cached or fetch and update BehaviorSubject + timestamp
  - In `getAdvertisements(restaurantId)` with filter: bypass cache, always fetch
  - In `createAdvertisement`, `updateAdvertisement`, `deleteAdvertisement`: set BehaviorSubject to `null` and `adsCacheTimestamp = 0`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 12.1 Write property test for ads cache hit avoids HTTP (Property 2 — ads)
    - **Property 2: Cache hit avoids HTTP request**
    - **Validates: Requirements 8.2**
    - Seed BehaviorSubject and timestamp; assert `getAdvertisements()` returns cached value without HTTP call

  - [ ]* 12.2 Write property test for filtered ads calls bypass cache (Property 6 — ads)
    - **Property 6: Filtered and global-list calls bypass cache**
    - **Validates: Requirements 8.4**
    - Use `fc.string()` for restaurant IDs; assert `getAdvertisements(restaurantId)` always makes HTTP call

- [x] 13. Implement in-flight request deduplication in `DataService`
  - Add `inFlightRequests: Map<string, Observable<any>>` field
  - In `get<T>(endpoint)`: build full URL; if entry exists in map return it; otherwise create `shareReplay(1)` observable with `finalize` to remove from map, store and return it
  - Leave `post`, `put`, `delete`, `uploadFile` unchanged
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 13.1 Write property test for concurrent GET deduplication (Property 7)
    - **Property 7: Concurrent GET requests share one in-flight observable**
    - **Validates: Requirements 9.2, 9.3**
    - Use `fc.string()` for URLs; make two concurrent `get()` calls, assert single HTTP request issued

  - [ ]* 13.2 Write property test for completed observable removed from map (Property 8)
    - **Property 8: Completed in-flight observable is removed from the map**
    - **Validates: Requirements 9.4**
    - Use `fc.string()` for URLs; after observable completes, assert next `get()` creates new HTTP request

  - [ ]* 13.3 Write property test for non-GET methods not deduplicated (Property 9)
    - **Property 9: Non-GET methods are never deduplicated**
    - **Validates: Requirements 9.5**
    - Use `fc.string()` for URLs; two concurrent `post()` calls must each produce independent HTTP requests

- [x] 14. Checkpoint — Ensure all `DataService` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement localStorage profile persistence in `UserService`
  - Define `UserProfileCache` interface `{ type, restaurantId, displayName, photoURL }`
  - In constructor: read `localStorage['userProfileCache']` in `try/catch`; if valid JSON, merge into `currentProfileSubject`
  - In `getUserProfile(uid)` success path: write `{ type, restaurantId, displayName, photoURL }` to `localStorage['userProfileCache']` in `try/catch`
  - In `deleteUserProfile(uid)` success path: call `localStorage.removeItem('userProfileCache')` in `try/catch`
  - In `clearAuthToken()`: call `localStorage.removeItem('userProfileCache')` in `try/catch`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 15.1 Write property test for successful profile fetch persists to localStorage (Property 10)
    - **Property 10: Successful profile fetch persists to localStorage**
    - **Validates: Requirements 10.2**
    - Use `fc.record({ type: fc.string(), restaurantId: fc.string(), displayName: fc.string(), photoURL: fc.string() })`; assert localStorage written after `getUserProfile` resolves

  - [ ]* 15.2 Write unit test for profile removal clears localStorage (Property 11)
    - **Property 11: Profile removal clears localStorage**
    - **Validates: Requirements 10.3, 10.4**
    - Seed localStorage; call `deleteUserProfile` and `clearAuthToken`; assert `localStorage['userProfileCache']` absent

  - [ ]* 15.3 Write unit test for constructor hydration from localStorage (Requirement 10.1)
    - Seed `localStorage['userProfileCache']` before constructing service; assert `currentProfileSubject` populated synchronously

  - [ ]* 15.4 Write unit test for localStorage exception resilience (Requirement 10.5)
    - Mock `localStorage.getItem` to throw; assert `UserService` constructs without error

- [x] 16. Checkpoint — Ensure all `UserService` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Merge two `getBatchStats` calls into one in `HomePage`
  - Remove the separate `getBatchStats` call inside the `restaurants$` subscription
  - Remove the separate `getBatchStats` call inside `loadNearbyRestaurants`
  - After both `restaurants$` and `nearby$` have emitted, compute the deduplicated union of IDs and call `getBatchStats` exactly once
  - Use `combineLatest` or `forkJoin` to coordinate the two lists; handle the case where either list is empty
  - Populate `ratingMap` from the single response
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 17.1 Write property test for single deduplicated getBatchStats call (Property 12)
    - **Property 12: Single deduplicated getBatchStats call covers all IDs**
    - **Validates: Requirements 11.1, 11.2, 11.4**
    - Use `fc.array(fc.string())` for trending and nearby ID arrays; assert `getBatchStats` called once with deduplicated union

  - [ ]* 17.2 Write property test for ratingMap covers all IDs (Property 13)
    - **Property 13: ratingMap covers all restaurant IDs after getBatchStats**
    - **Validates: Requirements 11.3**
    - Use `fc.array(fc.string())` for both ID sets; after `getBatchStats` resolves, assert every ID has entry in `ratingMap`

- [x] 18. Add `dataGroups` to `ngsw-config.json`
  - Add three entries under `"dataGroups"`: `api-restaurants` (`/API/Restaurants/**`, freshness, 10m, 10s, maxSize 50), `api-advertisements` (`/API/Advertisements/**`, freshness, 10m, 10s, maxSize 50), `api-reviews` (`/API/Reviews/**`, freshness, 5m, 10s, maxSize 50)
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 18.1 Write unit test for ngsw-config.json snapshot (Requirements 12.1–12.5)
    - Parse `ngsw-config.json` and assert each `dataGroup` has correct `strategy`, `maxAge`, `timeout`, and `maxSize`

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check with a minimum of 100 iterations (`fc.configureGlobal({ numRuns: 100 })`)
- Each property test must include the comment tag `// Feature: systematic-caching, Property N: <property_text>`
- `isCacheValid` is duplicated intentionally in each service to avoid coupling
- The `finalize` operator in `DataService.get` ensures the in-flight map is cleaned up on both completion and error
