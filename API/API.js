import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

const app = express();
const port = 3000;

// --- Firebase Initialisation ---
try {
  const serviceAccount = JSON.parse(
    await readFile(new URL('./serviceAccountKey.json', import.meta.url))
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    ignoreUndefinedProperties: true,
    projectId: serviceAccount.project_id,
    databaseId: "default"
  });
} catch (error) {
  console.error("FATAL: Could not initialise Firebase Admin SDK. Check serviceAccountKey.json location.", error);
  process.exit(1);
}

const database = admin.firestore();
database.settings({ databaseId: '(default)' });

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Local placeholder path returned by API when image missing
const PLACEHOLDER_PATH = path.join(path.dirname(import.meta.url), 'Placeholder.png');

// Helper: sanitise value by replacing null/undefined with '—'
const sanitiseValue = (value) => {
  if (value === null || typeof value === 'undefined') return '—';
  return value;
};

// Helper: sanitise object fields recursively
const sanitiseRecord = (raw) => {
  const output = {};
  for (const key of Object.keys(raw)) {
    const value = raw[key];

    // Special-case for ImageUrl to give placeholder when empty
    if (/^image(url)?$/i.test(key) || /^imageUrl$/i.test(key) || /^ImageUrl$/i.test(key)) {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        output[key] = PLACEHOLDER_PATH;
        continue;
      }
      output[key] = value;
      continue;
    }

    // If it's an object, sanitise shallowly
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = {};
      for (const subKey of Object.keys(value)) {
        const subValue = value[subKey];
        output[key][subKey] = (subValue === null || typeof subValue === 'undefined') ? '—' : subValue;
      }
      continue;
    }

    // If it's an array, sanitise elements
    if (Array.isArray(value)) {
      output[key] = value.map(v => (v === null || typeof v === 'undefined') ? '—' : v);
      continue;
    }
    
    // Primitive case
    output[key] = sanitiseValue(value);
  }

  // Ensure image path exists in a consistent key if none of the above matched
  if (!('ImageUrl' in output) && !('imageUrl' in output) && !('image' in output)) {
    output.ImageUrl = PLACEHOLDER_PATH;
  }
  return output;
};

// --- Security Helpers ---
// These helpers centralise our security logic in one place for easier maintenance

/**
 * Verify that the authenticated user owns the resource they're trying to access.
 * This is a critical security check that prevents users from modifying other users' data.
 * @param {string} authenticatedUid - The uid from the verified JWT token
 * @param {string} resourceUid - The uid of the resource being accessed
 * @returns {boolean} - True if the user owns the resource
 */
const verifyOwnership = (authenticatedUid, resourceUid) => {
  return authenticatedUid === resourceUid;
};

/**
 * Extract the authenticated user's uid from the request object.
 * The authenticate middleware attaches this after verifying the JWT token.
 * @param {express.Request} request - The Express request object
 * @returns {string|null} - The authenticated uid or null if not authenticated
 */
const getAuthenticatedUid = (request) => {
  return request.uid || null;
};

// --- Authentication middleware ---
/**
 * Middleware that verifies Firebase ID tokens and attaches the user's uid to the request.
 * This must run before any protected routes to ensure the user is authenticated.
 * The uid is extracted from the verified JWT token and attached to the request object.
 */
async function authenticate(request, response, next) {
  const authHeader = request.headers.authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Unauthorised: No token provided' });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify the token with Firebase Admin SDK (this checks signature, expiry, etc.)
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Attach the verified uid to the request for use in route handlers
    // This is safe because we've cryptographically verified the token
    request.uid = decodedToken.uid;
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return response.status(401).json({ error: 'Unauthorised: Invalid token' });
  }
}

// --- Restaurant CRUD endpoints ---

// Get all restaurants
app.get('/API/Restaurants', async (request, response) => {
  try {
    const snapshot = await database.collection('Restaurants').get();
    const restaurantList = snapshot.docs.map(document => ({
      id: document.id,
      ...sanitiseRecord(document.data())
    }));
    console.log(`[GET] /API/Restaurants - Returned ${restaurantList.length} restaurants`);
    response.json({ count: restaurantList.length, data: restaurantList });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve restaurants:', error);
    response.status(500).json({ error: 'Failed to retrieve data.' });
  }
});

// Get single restaurant by id
app.get('/API/Restaurants/:id', async (request, response) => {
  try {
    const id = request.params.id;
    const document = await database.collection('Restaurants').doc(id).get();
    if (!document.exists) {
      console.log(`[GET] /API/Restaurants/${id} - Not found`);
      return response.status(404).json({ error: 'Not found' });
    }
    console.log(`[GET] /API/Restaurants/${id} - Success`);
    response.json({ id: document.id, ...sanitiseRecord(document.data()) });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve restaurant:', error);
    response.status(500).json({ error: 'Failed to retrieve restaurant.' });
  }
});

// Create a new restaurant
app.post('/API/Restaurants', async (request, response) => {
  try {
    const payload = request.body || {};
    if (!payload.Name_EN && !payload.Name_TC) {
      console.log('[POST] /API/Restaurants - Missing required name fields.');
      return response.status(400).json({ error: 'Name_EN or Name_TC is required.' });
    }
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const documentRef = await database.collection('Restaurants').add(payload);
    console.log(`[POST] /API/Restaurants - Created document with ID: ${documentRef.id}`);
    response.status(201).json({ id: documentRef.id });
  } catch (error) {
    console.error('[ERROR] Failed to create restaurant:', error);
    response.status(500).json({ error: 'Failed to create restaurant.' });
  }
});

// Update an existing restaurant
app.put('/API/Restaurants/:id', async (request, response) => {
  try {
    const id = request.params.id;
    const payload = request.body || {};
    delete payload.createdAt;
    await database.collection('Restaurants').doc(id).set(payload, { merge: true });
    await database.collection('Restaurants').doc(id).update({
      modifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[PUT] /API/Restaurants/${id} - Updated`);
    response.status(204).send();
  } catch (error) {
    console.error('[ERROR] Failed to update restaurant:', error);
    response.status(500).json({ error: 'Failed to update restaurant.' });
  }
});

// Delete a restaurant
app.delete('/API/Restaurants/:id', async (request, response) => {
  try {
    const id = request.params.id;
    await database.collection('Restaurants').doc(id).delete();
    console.log(`[DELETE] /API/Restaurants/${id} - Deleted`);
    response.status(204).send();
  } catch (error) {
    console.error('[ERROR] Failed to delete restaurant:', error);
    response.status(500).json({ error: 'Failed to delete restaurant.' });
  }
});

// --- User CRUD endpoints ---

// Get all users
app.get('/API/Users', async (request, response) => {
  try {
    const snapshot = await database.collection('Users').get();
    const users = snapshot.docs.map(document => ({
      id: document.id,
      ...sanitiseRecord(document.data())
    }));
    console.log(`[GET] /API/Users - Returned ${users.length} users`);
    response.json({ count: users.length, data: users });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve users:', error);
    response.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Get single user by uid
app.get('/API/Users/:uid', async (request, response) => {
  try {
    const uid = request.params.uid;
    const document = await database.collection('Users').doc(uid).get();
    if (!document.exists) {
      console.log(`[GET] /API/Users/${uid} - Not found`);
      return response.status(404).json({ error: 'User not found' });
    }
    console.log(`[GET] /API/Users/${uid} - Success`);
    response.json({ uid: document.id, ...sanitiseRecord(document.data()) });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve user:', error);
    response.status(500).json({ error: 'Failed to retrieve user.' });
  }
});

// Create a new user record
app.post('/API/Users', authenticate, async (request, response) => {
  try {
    console.log('[POST] /API/Users - Start');
    const payload = request.body || {};
    const authenticatedUid = getAuthenticatedUid(request);
    console.log(`[POST] /API/Users - Authenticated UID: ${authenticatedUid}`);

    if (!payload.uid && !payload.email) {
      console.log('[POST] /API/Users - Missing uid and email.');
      return response.status(400).json({ error: 'uid or email is required.' });
    }
    if (payload.uid && !verifyOwnership(authenticatedUid, payload.uid)) {
      console.log('[POST] /API/Users - Forbidden: UID mismatch.');
      return response.status(403).json({ error: 'Forbidden: You can only create your own user profile.' });
    }

    const uid = payload.uid || authenticatedUid;
    const existingDocument = await database.collection('Users').doc(uid).get();
    if (existingDocument.exists) {
      console.log(`[POST] /API/Users - Profile already exists: ${uid}`);
      return response.status(409).json({ error: 'User profile already exists.' });
    }

    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    payload.modifiedAt = admin.firestore.FieldValue.serverTimestamp();
    await database.collection('Users').doc(uid).set(payload);
    console.log(`[POST] /API/Users - Created user profile with ID: ${uid}`);
    response.status(201).json({ id: uid });
  } catch (error) {
    console.error('[ERROR] Failed to create user:', error);
    response.status(500).json({ error: 'Failed to create user.' });
  }
});

// Update an existing user
app.put('/API/Users/:uid', authenticate, async (request, response) => {
  try {
    const uid = request.params.uid;
    const payload = request.body || {};
    const authenticatedUid = getAuthenticatedUid(request);
    delete payload.createdAt;
    delete payload.uid;
    const documentRef = database.collection('Users').doc(uid);
    const documentSnapshot = await documentRef.get();

    if (!documentSnapshot.exists) {
      console.log(`[PUT] /API/Users/${uid} - Not found`);
      return response.status(404).json({ error: 'User profile not found' });
    }
    const existing = documentSnapshot.data() || {};
    if (existing.uid && !verifyOwnership(authenticatedUid, existing.uid)) {
      console.log(`[PUT] /API/Users/${uid} - Forbidden: UID mismatch.`);
      return response.status(403).json({ error: 'Forbidden: You can only modify your own user profile.' });
    }

    payload.modifiedAt = admin.firestore.FieldValue.serverTimestamp();
    await documentRef.set(payload, { merge: true });
    console.log(`[PUT] /API/Users/${uid} - Updated`);
    response.status(204).send();
  } catch (error) {
    console.error('[ERROR] Failed to update user:', error);
    response.status(500).json({ error: 'Failed to update user.' });
  }
});

// Delete a user
app.delete('/API/Users/:uid', authenticate, async (request, response) => {
  try {
    const uid = request.params.uid;
    const authenticatedUid = getAuthenticatedUid(request);
    const documentRef = database.collection('Users').doc(uid);
    const documentSnapshot = await documentRef.get();

    if (!documentSnapshot.exists) {
      console.log(`[DELETE] /API/Users/${uid} - Not found`);
      return response.status(404).json({ error: 'User profile not found' });
    }

    const existing = documentSnapshot.data() || {};
    if (existing.uid && !verifyOwnership(authenticatedUid, existing.uid)) {
      console.log(`[DELETE] /API/Users/${uid} - Forbidden: UID mismatch.`);
      return response.status(403).json({ error: 'Forbidden: You can only delete your own user profile.' });
    }

    await documentRef.delete();
    console.log(`[DELETE] /API/Users/${uid} - Deleted`);
    response.status(204).send();
  } catch (error) {
    console.error('[ERROR] Failed to delete user:', error);
    response.status(500).json({ error: 'Failed to delete user.' });
  }
});

// --- Booking CRUD endpoints ---

// Get all bookings (optionally filtered by userId)
app.get('/API/Bookings', authenticate, async (request, response) => {
  try {
    const authenticatedUid = getAuthenticatedUid(request);
    const userId = request.query.userId;

    // Security check: users can only view their own bookings
    if (userId && userId !== authenticatedUid) {
      console.log('[GET] /API/Bookings - Forbidden: User attempting to view another user\'s bookings');
      return response.status(403).json({ error: 'Forbidden: You can only view your own bookings.' });
    }

    // Query bookings
    let query = database.collection('Bookings');
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.get();
    const bookings = snapshot.docs.map(document => ({
      id: document.id,
      ...sanitiseRecord(document.data())
    }));

    console.log(`[GET] /API/Bookings - Returned ${bookings.length} bookings`);
    response.json({ count: bookings.length, data: bookings });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve bookings:', error);
    response.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

// Get single booking by ID
app.get('/API/Bookings/:id', authenticate, async (request, response) => {
  try {
    const id = request.params.id;
    const authenticatedUid = getAuthenticatedUid(request);
    const document = await database.collection('Bookings').doc(id).get();

    if (!document.exists) {
      console.log(`[GET] /API/Bookings/${id} - Not found`);
      return response.status(404).json({ error: 'Booking not found' });
    }

    const booking = document.data();

    // Security check: users can only view their own bookings
    if (booking.userId !== authenticatedUid) {
      console.log(`[GET] /API/Bookings/${id} - Forbidden: User attempting to view another user's booking`);
      return response.status(403).json({ error: 'Forbidden: You can only view your own bookings.' });
    }

    console.log(`[GET] /API/Bookings/${id} - Success`);
    response.json({ id: document.id, ...sanitiseRecord(booking) });
  } catch (error) {
    console.error('[ERROR] Failed to retrieve booking:', error);
    response.status(500).json({ error: 'Failed to retrieve booking.' });
  }
});

// Create a new booking
app.post('/API/Bookings', authenticate, async (request, response) => {
  try {
    const payload = request.body || {};
    const authenticatedUid = getAuthenticatedUid(request);

    // Validate required fields
    if (!payload.restaurantId || !payload.dateTime || !payload.numberOfGuests) {
      console.log('[POST] /API/Bookings - Missing required fields');
      return response.status(400).json({ error: 'restaurantId, dateTime, and numberOfGuests are required.' });
    }

    // Security check: users can only create bookings for themselves
    if (payload.userId && payload.userId !== authenticatedUid) {
      console.log('[POST] /API/Bookings - Forbidden: User attempting to create booking for another user');
      return response.status(403).json({ error: 'Forbidden: You can only create bookings for yourself.' });
    }

    // Set the userId to the authenticated user's ID
    payload.userId = authenticatedUid;

    // Set timestamps and default statuses
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    payload.modifiedAt = admin.firestore.FieldValue.serverTimestamp();
    if (!payload.status) payload.status = 'pending';
    if (!payload.paymentStatus) payload.paymentStatus = 'unpaid';

    const documentRef = await database.collection('Bookings').add(payload);
    console.log(`[POST] /API/Bookings - Created booking with ID: ${documentRef.id}`);
    response.status(201).json({ id: documentRef.id });
  } catch (error) {
    console.error('[ERROR] Failed to create booking:', error);
    response.status(500).json({ error: 'Failed to create booking.' });
  }
});

// Update an existing booking
app.put('/API/Bookings/:id', authenticate, async (request, response) => {
  try {
    const id = request.params.id;
    const payload = request.body || {};
    const authenticatedUid = getAuthenticatedUid(request);

    // Fetch existing booking
    const documentRef = database.collection('Bookings').doc(id);
    const documentSnapshot = await documentRef.get();

    if (!documentSnapshot.exists) {
      console.log(`[PUT] /API/Bookings/${id} - Not found`);
      return response.status(404).json({ error: 'Booking not found' });
    }

    const existingBooking = documentSnapshot.data();

    // Security check: users can only modify their own bookings
    if (existingBooking.userId !== authenticatedUid) {
      console.log(`[PUT] /API/Bookings/${id} - Forbidden: User attempting to modify another user's booking`);
      return response.status(403).json({ error: 'Forbidden: You can only modify your own bookings.' });
    }

    // Remove fields that shouldn't be updated
    delete payload.createdAt;
    delete payload.userId;

    // Update modifiedAt timestamp
    payload.modifiedAt = admin.firestore.FieldValue.serverTimestamp();

    await documentRef.set(payload, { merge: true });
    console.log(`[PUT] /API/Bookings/${id} - Updated`);
    response.status(204).send();
  } catch (error) {
    console.error('[ERROR] Failed to update booking:', error);
    response.status(500).json({ error: 'Failed to update booking.' });
  }
});

// Delete a booking
app.delete('/API/Bookings/:id', authenticate, async (request, response) => {
  try {
    const id = request.params.id;
    const authenticatedUid = getAuthenticatedUid(request);

    // Fetch existing booking
    const documentRef = database.collection('Bookings').doc(id);
    const documentSnapshot = await documentRef.get();

    if (!documentSnapshot.exists) {
      console.log(`[DELETE] /API/Bookings/${id} - Not found`);
      return response.status(404).json({ error: 'Booking not found' });
    }

    const existingBooking = documentSnapshot.data();

    // Security check: users can only delete their own bookings
    if (existingBooking.userId !== authenticatedUid) {
      console.log(`[DELETE] /API/Bookings/${id} - Forbidden: User attempting to delete another user's booking`);
      return response.status(403).json({ error: 'Forbidden: You can only delete your own bookings.' });
    }

    await documentRef.delete();
    console.log(`[DELETE] /API/Bookings/${id} - Deleted`);
    response.status(204).send();
  } catch (error) {
    console.error('[ERROR] Failed to delete booking:', error);
    response.status(500).json({ error: 'Failed to delete booking.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`REST API Service running at http://localhost:${port}`);
  console.log(`Restaurant endpoint: http://localhost:${port}/API/Restaurants`);
  console.log(`User endpoint: http://localhost:${port}/API/Users`);
  console.log(`Booking endpoint: http://localhost:${port}/API/Bookings`);
});