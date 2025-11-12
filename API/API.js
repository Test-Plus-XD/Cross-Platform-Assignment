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
    const restaurantList = snapshot.docs.map(document => {
      const raw = document.data();
      const sanitised = sanitiseRecord(raw);
      return {
        id: document.id,
        ...sanitised
      };
    });
    response.json({
      count: restaurantList.length,
      data: restaurantList
    });
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    response.status(500).json({ error: "Failed to retrieve data." });
  }
});

// Get single restaurant by id
app.get('/API/Restaurants/:id', async (request, response) => {
  try {
    const id = request.params.id;
    const document = await database.collection('Restaurants').doc(id).get();
    if (!document.exists) {
      return response.status(404).json({ error: 'Not found' });
    }
    const raw = document.data();
    const sanitised = sanitiseRecord(raw);
    response.json({ id: document.id, ...sanitised });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    response.status(500).json({ error: 'Failed to retrieve restaurant.' });
  }
});

// Create a new restaurant
app.post('/API/Restaurants', async (request, response) => {
  try {
    const payload = request.body || {};
    if (!payload.Name_EN && !payload.Name_TC) {
      return response.status(400).json({ error: 'Name_EN or Name_TC is required.' });
    }
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const documentRef = await database.collection('Restaurants').add(payload);
    response.status(201).json({ id: documentRef.id });
  } catch (error) {
    console.error('Error creating restaurant:', error);
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
    response.status(204).send();
  } catch (error) {
    console.error('Error updating restaurant:', error);
    response.status(500).json({ error: 'Failed to update restaurant.' });
  }
});

// Delete a restaurant
app.delete('/API/Restaurants/:id', async (request, response) => {
  try {
    const id = request.params.id;
    await database.collection('Restaurants').doc(id).delete();
    response.status(204).send();
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    response.status(500).json({ error: 'Failed to delete restaurant.' });
  }
});

// --- User CRUD endpoints ---

// Get all users (publicly accessible metadata only)
app.get('/API/Users', async (request, response) => {
  try {
    const snapshot = await database.collection('Users').get();
    const users = snapshot.docs.map(document => {
      const raw = document.data();
      const sanitised = sanitiseRecord(raw);
      return {
        id: document.id,
        ...sanitised
      };
    });
    response.json({ count: users.length, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    response.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Get single user by uid (use uid as document ID)
app.get('/API/Users/:uid', async (request, response) => {
  try {
    const uid = request.params.uid;
    const document = await database.collection('Users').doc(uid).get();
    if (!document.exists) {
      return response.status(404).json({ error: 'User not found' });
    }
    const raw = document.data();
    const sanitised = sanitiseRecord(raw);
    response.json({ uid: document.id, ...sanitised });
  } catch (error) {
    console.error('Error fetching user:', error);
    response.status(500).json({ error: 'Failed to retrieve user.' });
  }
});

// Create a new user record (protected)
app.post('/API/Users', authenticate, async (request, response) => {
  try {
    console.log('=== POST /API/Users - Start ===');
    const payload = request.body || {};
    const authenticatedUid = getAuthenticatedUid(request);
    
    console.log('Authenticated UID:', authenticatedUid);
    console.log('Payload UID:', payload.uid);
    console.log('Payload email:', payload.email);
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    
    // Require uid or email
    if (!payload.uid && !payload.email) {
      console.log('Error: Missing uid and email');
      return response.status(400).json({ error: 'uid or email is required.' });
    }

    // Security check: ensure authenticated user can only create their own record
    if (payload.uid && !verifyOwnership(authenticatedUid, payload.uid)) {
      console.log('Error: Ownership verification failed');
      return response.status(403).json({ 
        error: 'Forbidden: You can only create your own user profile.' 
      });
    }

    // Use uid from payload, or fall back to authenticated uid
    const uid = payload.uid || authenticatedUid;
    console.log('Using UID for document:', uid);
    
    // Check if user already exists
    const existingDocument = await database.collection('Users').doc(uid).get();
    if (existingDocument.exists) {
      console.log('Error: User profile already exists');
      return response.status(409).json({ error: 'User profile already exists.' });
    }
    
    console.log('User profile does not exist, creating new document');

    // Add timestamps
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    payload.modifiedAt = admin.firestore.FieldValue.serverTimestamp();
    
    console.log('Writing to Firestore...');
    // Create user document with uid as document ID
    await database.collection('Users').doc(uid).set(payload);
    
    console.log(`SUCCESS: User profile created with ID: ${uid}`);
    console.log('=== POST /API/Users - Complete ===');
    response.status(201).json({ id: uid });
  } catch (error) {
    console.error('=== POST /API/Users - Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    response.status(500).json({ error: 'Failed to create user.' });
  }
});

// Update an existing user (protected)
app.put('/API/Users/:uid', authenticate, async (request, response) => {
  try {
    const uid = request.params.uid;
    const payload = request.body || {};
    const authenticatedUid = getAuthenticatedUid(request);
    
    // Remove fields that shouldn't be updated
    delete payload.createdAt;
    delete payload.uid;

    // Fetch existing user document
    const documentRef = database.collection('Users').doc(uid);
    const documentSnapshot = await documentRef.get();
    
    if (!documentSnapshot.exists) {
      return response.status(404).json({ error: 'User profile not found' });
    }

    const existing = documentSnapshot.data() || {};

    // Security check: enforce ownership
    // Users can only modify their own profile
    if (existing.uid && !verifyOwnership(authenticatedUid, existing.uid)) {
      return response.status(403).json({ 
        error: 'Forbidden: You can only modify your own user profile.' 
      });
    }

    // Add modified timestamp
    payload.modifiedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update user document
    await documentRef.set(payload, { merge: true });
    
    console.log(`User profile updated: ${uid}`);
    response.status(204).send();
  } catch (error) {
    console.error('Error updating user:', error);
    response.status(500).json({ error: 'Failed to update user.' });
  }
});

// Delete a user (protected)
app.delete('/API/Users/:uid', authenticate, async (request, response) => {
  try {
    const uid = request.params.uid;
    const authenticatedUid = getAuthenticatedUid(request);
    const documentRef = database.collection('Users').doc(uid);
    const documentSnapshot = await documentRef.get();
    
    if (!documentSnapshot.exists) {
      return response.status(404).json({ error: 'User profile not found' });
    }

    const existing = documentSnapshot.data() || {};

    // Security check: enforce ownership
    // Users can only delete their own profile
    if (existing.uid && !verifyOwnership(authenticatedUid, existing.uid)) {
      return response.status(403).json({ 
        error: 'Forbidden: You can only delete your own user profile.' 
      });
    }

    await documentRef.delete();
    
    console.log(`User profile deleted: ${uid}`);
    response.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    response.status(500).json({ error: 'Failed to delete user.' });
  }
});

// --- Start server ---
app.listen(port, () => {
  console.log(`REST API Service running at http://localhost:${port}`);
  console.log(`Restaurant endpoint: http://localhost:${port}/API/Restaurants`);
  console.log(`User endpoint: http://localhost:${port}/API/Users`);
}); 