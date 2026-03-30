# Design Document — Systematic Caching

## Overview

The app currently makes redundant HTTP calls on every page visit because its services lack TTL
enforcement and in-flight deduplication. This design introduces a uniform, layered caching
strategy across all major Angular services:

- **In-memory TTL caches** in `RestaurantsService`, `ReviewsService`, and `AdvertisementsService`
  using a shared `isCacheValid` helper pattern.
- **In-flight request deduplication** in `DataService` via `shareReplay(1)` so concurrent
  subscribers to the same URL share one HTTP call.
- **localStorage persistence** in `UserService` so the navigation tabs reflect the user's account
  type immediately on launch without waiting for the profile API call.
- **Merged batch-stats call** in `HomePage` so trending and nearby restaurant ratings are fetched
  in a single request instead of two.
- **Service-worker data groups** in `ngsw-config.json` so public read-only API responses are
  served stale-while-revalidating on slow connections.

The design deliberately avoids a shared cache service or generic cache decorator to keep the
changes surgical and reviewable — each service owns its own cache state, which is consistent with
the existing `BehaviorSubject` pattern already present in `RestaurantsService`.

---

## Architecture

```mermaid
graph TD
    subgraph Browser
        SW[Service Worker\nngsw-config.json]
        LS[localStorage\nuserProfileCache]

        subgraph Angular App
            HP[HomePage]
            RS[RestaurantsService\nMap TTL caches]
            RV[ReviewsService\nMap TTL caches]
            AS[AdvertisementsService\nBehaviorSubject TTL]
            US[UserService\nlocalStorage hydration]
            DS[DataService\nin-flight Map]
        end
    end

    subgraph Network
        API[Vercel API]
    end

    HP -->|single getBatchStats| RV
    HP --> RS
    HP --> AS
    RS --> DS
    RV --> DS
    AS --> DS
    US --> DS
    US <-->|read/write| LS
    DS -->|shareReplay(1)| SW
    SW -->|freshness strategy| API
```

**Cache layers (outermost to innermost):**

1. Service Worker — HTTP-level, survives page reload, covers GET requests to `/API/**`
2. In-memory TTL Maps / BehaviorSubjects — process-level, fast synchronous reads
3. In-flight deduplication — prevents duplicate concurrent HTTP calls within a single page load
4. localStorage — survives page reload for the user profile only

---

## Components and Interfaces

### `CacheEntry<T>` (shared type, defined per-service)

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number; // Date.now() at time of storage
}
```

Defined inline in each service file (no shared module needed — the type is trivial and keeping it
local avoids coupling).

### `isCacheValid` helper (private method, duplicated per-service)

```typescript
private isCacheValid(timestamp: number, ttlMs: number): boolean {
  return Date.now() - timestamp < ttlMs;
}
```

Each of `RestaurantsService`, `ReviewsService`, and `AdvertisementsService` gets an identical
private copy. Duplication is intentional — it avoids a shared utility import that would couple
unrelated services.

### `RestaurantsService` cache fields

| Field | Type | TTL |
|---|---|---|
| `restaurantCache` | `Map<string, CacheEntry<Restaurant>>` | 10 min |
| `menuCache` | `Map<string, CacheEntry<MenuItem[]>>` | 10 min |
| `restaurantsCacheTimestamp` | `number` (init `0`) | 10 min (guards existing `restaurantsCache` BehaviorSubject) |

### `ReviewsService` cache fields

| Field | Type | TTL |
|---|---|---|
| `reviewsCache` | `Map<string, CacheEntry<Review[]>>` | 5 min |
| `statsCache` | `Map<string, CacheEntry<ReviewStats>>` | 5 min |
| `batchStatsCache` | `Map<string, CacheEntry<BatchStats>>` | 5 min |

`BatchStats` key = `restaurantIds.slice().sort().join(',')`.

### `AdvertisementsService` cache fields

| Field | Type | TTL |
|---|---|---|
| `adsCache` | `BehaviorSubject<Advertisement[] \| null>` (init `null`) | 5 min |
| `adsCacheTimestamp` | `number` (init `0`) | 5 min |

### `DataService` in-flight map

| Field | Type |
|---|---|
| `inFlightRequests` | `Map<string, Observable<any>>` |

### `UserService` localStorage key

`localStorage['userProfileCache']` — JSON string of `{ type, restaurantId, displayName, photoURL }`.

---

## Data Models

### `CacheEntry<T>`

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
```

### `BatchStats`

```typescript
type BatchStats = Record<string, { totalReviews: number; averageRating: number }>;
```

### `UserProfileCache` (localStorage shape)

```typescript
interface UserProfileCache {
  type: string | null;
  restaurantId: string | null;
  displayName: string | null;
  photoURL: string | null;
}
```

### `ngsw-config.json` — `dataGroups` entries

```json
{
  "dataGroups": [
    {
      "name": "api-restaurants",
      "urls": ["/API/Restaurants/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 50,
        "maxAge": "10m",
        "timeout": "10s"
      }
    },
    {
      "name": "api-advertisements",
      "urls": ["/API/Advertisements/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 50,
        "maxAge": "10m",
        "timeout": "10s"
      }
    },
    {
      "name": "api-reviews",
      "urls": ["/API/Reviews/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 50,
        "maxAge": "5m",
        "timeout": "10s"
      }
    }
  ]
}
```

The `freshness` strategy tries the network first; if the network times out (10 s) it falls back to
the cached response. POST/PUT/DELETE requests are never intercepted by `dataGroups`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a
system — essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: isCacheValid correctness

*For any* timestamp `t` and TTL `ttlMs`, `isCacheValid(t, ttlMs)` returns `true` if and only if
`Date.now() - t < ttlMs`, and `false` otherwise. This holds for timestamps in the past, equal to
`Date.now()`, and for any positive TTL value.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

---

### Property 2: Cache hit avoids HTTP request

*For any* resource identifier (restaurant ID, menu restaurant ID, review restaurant ID, stats
restaurant ID, batch-stats key, or the global ads endpoint), if a valid cache entry exists for
that identifier (i.e., `isCacheValid` returns `true`), then calling the corresponding read method
a second time within the TTL window SHALL NOT produce a new HTTP request — the cached value is
returned directly.

**Validates: Requirements 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2**

---

### Property 3: Cache miss fetches and stores (round-trip)

*For any* resource identifier with no existing cache entry (or an expired one), calling the
corresponding read method SHALL fetch from the API and store the result so that a subsequent call
within the TTL window returns the cached value without a new HTTP request.

**Validates: Requirements 2.3, 3.3, 4.3**

---

### Property 4: Mutation invalidates targeted cache entry

*For any* resource identifier `id`, after a successful mutation (create, update, delete, upload,
or claim) that targets `id`, the next call to the corresponding read method for `id` SHALL trigger
a fresh HTTP request rather than returning a stale cached value.

**Validates: Requirements 2.4, 2.5, 2.6, 3.4, 3.5, 3.6, 4.4, 5.5, 6.4, 8.5**

---

### Property 5: Review mutation clears entire batch-stats cache

*For any* state of the batch-stats cache (zero or more entries), after a successful
`createReview`, `updateReview`, or `deleteReview` call, the batch-stats cache SHALL contain zero
entries.

**Validates: Requirements 7.4**

---

### Property 6: Filtered and global-list calls bypass cache

*For any* call to `getReviews()` without a `restaurantId`, or to `getAdvertisements(restaurantId)`
with a non-null `restaurantId`, the service SHALL always issue an HTTP request regardless of
whether a cache entry exists.

**Validates: Requirements 5.4, 8.4**

---

### Property 7: Concurrent GET requests share one in-flight observable

*For any* API endpoint URL, if two or more `DataService.get()` calls are made concurrently (before
the first completes), all callers SHALL receive the same observable backed by a single HTTP
request — not one HTTP request per caller.

**Validates: Requirements 9.2, 9.3**

---

### Property 8: Completed in-flight observable is removed from the map

*For any* API endpoint URL, after the in-flight observable for that URL completes (successfully or
with an error), a subsequent `DataService.get()` call to the same URL SHALL create a new HTTP
request rather than reusing the completed observable.

**Validates: Requirements 9.4**

---

### Property 9: Non-GET methods are never deduplicated

*For any* endpoint URL, two concurrent calls to `DataService.post()`, `put()`, `delete()`, or
`uploadFile()` SHALL each produce an independent HTTP request — the in-flight map is not consulted
for these methods.

**Validates: Requirements 9.5**

---

### Property 10: Successful profile fetch persists to localStorage

*For any* valid `UserProfile` returned by `getUserProfile(uid)`, the fields
`{ type, restaurantId, displayName, photoURL }` SHALL be written to
`localStorage['userProfileCache']` as a JSON string immediately after the response is received.

**Validates: Requirements 10.2**

---

### Property 11: Profile removal clears localStorage

*For any* state where `localStorage['userProfileCache']` is set, after a successful
`deleteUserProfile(uid)` call or a `clearAuthToken()` call, `localStorage['userProfileCache']`
SHALL be absent (removed, not set to null or empty string).

**Validates: Requirements 10.3, 10.4**

---

### Property 12: Single deduplicated getBatchStats call covers all IDs

*For any* combination of trending restaurant IDs and nearby restaurant IDs, the `HomePage` SHALL
call `getBatchStats` exactly once with an array that is the deduplicated union of both sets — no
ID appears more than once, and every ID from either set is present.

**Validates: Requirements 11.1, 11.2, 11.4**

---

### Property 13: ratingMap covers all restaurant IDs after getBatchStats

*For any* set of trending and nearby restaurant IDs, after `getBatchStats` resolves, every ID
from both sets SHALL have a corresponding entry in `ratingMap`.

**Validates: Requirements 11.3**

---

## Error Handling

### `isCacheValid`

No error handling needed — the method is a pure arithmetic comparison. Callers treat a `false`
result as a cache miss and proceed to fetch.

### In-memory TTL caches (RestaurantsService, ReviewsService, AdvertisementsService)

- On HTTP error, the cache entry is **not** written. The error propagates to the caller via the
  existing `catchError` operators already present in each service.
- Stale entries are never explicitly evicted on error — the next call after TTL expiry will
  attempt a fresh fetch.

### DataService in-flight deduplication

- If the in-flight observable errors, the `finalize` operator removes the entry from the map so
  the next caller gets a fresh attempt.
- The error is re-thrown to all current subscribers via `shareReplay(1)`'s error propagation.

### UserService localStorage

- All `localStorage` reads and writes are wrapped in `try/catch`. On exception (e.g. private
  browsing quota exceeded), the service logs a warning and continues — the in-memory
  `currentProfileSubject` remains the source of truth.
- On `getUserProfile` 404, `localStorage['userProfileCache']` is left unchanged (the stored
  profile may still be useful for navigation rendering).

### HomePage merged batch-stats call

- If `getBatchStats` errors, `ratingMap` remains at its previous value (empty on first load).
  The error is caught and logged; the page renders without ratings rather than crashing.

### Service Worker

- The `freshness` strategy falls back to the cached response automatically when the network
  times out (10 s). No application-level error handling is required.
- If no cached response exists and the network fails, the Angular HTTP error propagates normally
  to the service layer.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:

- **Unit tests** cover specific examples, integration points, and edge cases (e.g. localStorage
  throws, empty ID arrays, ngsw-config snapshot).
- **Property-based tests** verify universal correctness across randomly generated inputs (e.g.
  any timestamp/TTL pair, any set of restaurant IDs, any concurrent call pattern).

### Property-Based Testing Library

Use **[fast-check](https://github.com/dubzzz/fast-check)** (TypeScript-native, works with Jest /
Jasmine, no additional setup beyond `npm install fast-check --save-dev`).

Each property test MUST run a minimum of **100 iterations** (fast-check default is 100; do not
lower it).

Each property test MUST include a comment tag in the format:

```
// Feature: systematic-caching, Property N: <property_text>
```

### Property Test Mapping

| Design Property | Test file | fast-check arbitraries |
|---|---|---|
| P1 — isCacheValid correctness | `restaurants.service.spec.ts` | `fc.integer()`, `fc.nat()` |
| P2 — Cache hit avoids HTTP | per-service spec | `fc.string()` (IDs) |
| P3 — Cache miss round-trip | per-service spec | `fc.string()` (IDs) |
| P4 — Mutation invalidates cache | per-service spec | `fc.string()` (IDs) |
| P5 — Review mutation clears batch cache | `reviews.service.spec.ts` | `fc.array(fc.string())` |
| P6 — Filtered calls bypass cache | `reviews.service.spec.ts`, `advertisements.service.spec.ts` | `fc.string()` |
| P7 — Concurrent GET deduplication | `data.service.spec.ts` | `fc.string()` (URLs) |
| P8 — Completed observable removed | `data.service.spec.ts` | `fc.string()` (URLs) |
| P9 — Non-GET not deduplicated | `data.service.spec.ts` | `fc.string()` (URLs) |
| P10 — Profile fetch persists to localStorage | `user.service.spec.ts` | `fc.record(...)` |
| P11 — Profile removal clears localStorage | `user.service.spec.ts` | N/A (example-style) |
| P12 — Single deduplicated getBatchStats | `home.page.spec.ts` | `fc.array(fc.string())` |
| P13 — ratingMap covers all IDs | `home.page.spec.ts` | `fc.array(fc.string())` |

### Unit Test Coverage

Unit tests (Jasmine + Angular `TestBed`) should cover:

- **Requirement 10.1** — `UserService` reads `localStorage` on construction and populates
  `currentProfileSubject` synchronously (example test with seeded localStorage).
- **Requirement 10.5** — `UserService` does not crash when `localStorage` throws (mock
  `localStorage.getItem` to throw, verify service constructs without error).
- **Requirements 12.1–12.5** — `ngsw-config.json` snapshot: parse the file and assert each
  `dataGroup` has the correct `strategy`, `maxAge`, `timeout`, and `maxSize`.
- Edge cases: empty ID array passed to `getBatchStats`, `getRestaurantById` called with empty
  string, `getReviews` called with both `restaurantId` and `userId`.

### Test Configuration

```typescript
// fast-check configuration for all property tests
import fc from 'fast-check';

fc.configureGlobal({ numRuns: 100 });
```
