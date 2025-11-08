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
  });
} catch (error) {
  console.error("FATAL: Could not initialize Firebase Admin SDK. Check serviceAccountKey.json location.", error);
  process.exit(1);
}

const db = admin.firestore();
db.settings({databaseId:'(default)'});

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Local placeholder path returned by API when image missing
const PLACEHOLDER_PATH = path.join(path.dirname(import.meta.url), 'Placeholder.png');

// Helper: sanitise value by replacing null/undefined with '—'
const sanitiseValue = (value) => {
  if (value === null || typeof value === 'undefined') return '—';
  // Keep arrays, objects as is (we'll sanitise recursively if needed)
  return value;
};

// Helper: sanitise object fields recursively, but avoid walking large nested subcollections
const sanitiseRecord = (raw) => {
  const out = {};
  for (const key of Object.keys(raw)) {
    const value = raw[key];

    // Special-case for ImageUrl (and several common variants) to give placeholder when empty
    if (/^image(url)?$/i.test(key) || /^imageUrl$/i.test(key) || /^ImageUrl$/i.test(key)) {
      // If value falsy or empty string -> use placeholder
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        out[key] = PLACEHOLDER_PATH;
        continue;
      }
      out[key] = value;
      continue;
    }

    // If it's an object (and not a Firestore Timestamp or GeoPoint), sanitise shallowly
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Firestore Timestamps have seconds/nanos or toDate; keep them as-is
      // For other nested objects we will sanitise leaf values only one level deep
      out[key] = {};
      for (const subKey of Object.keys(value)) {
        const subValue = value[subKey];
        out[key][subKey] = (subValue === null || typeof subValue === 'undefined') ? '—' : subValue;
      }
      continue;
    }

    // If it's an array, sanitise elements (primitive elements only)
    if (Array.isArray(value)) {
      out[key] = value.map(v => (v === null || typeof v === 'undefined') ? '—' : v);
      continue;
    }
    // Primitive case
    out[key] = sanitiseValue(value);
  }

  // Ensure image path exists in a consistent key if none of the above matched
  if (!('ImageUrl' in out) && !('imageUrl' in out) && !('image' in out)) {
    out.ImageUrl = PLACEHOLDER_PATH;
  }
  return out;
};

// --- Authentication middleware ---
// Verify Firebase ID token from Authorization: Bearer <token>
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.uid = decodedToken.uid; // attach uid for downstream handlers
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// --- CRUD endpoints ---
// Get all restaurants
app.get('/API/Restaurants', async (req, res) => {
  try {
    const snapshot = await db.collection('Restaurants').get();

    const restaurantList = snapshot.docs.map(doc => {
      const raw = doc.data();
      const sanitised = sanitiseRecord(raw);
      return {
        id: doc.id,
        ...sanitised
      };
    });

    res.json({
      count: restaurantList.length,
      data: restaurantList
    });

  } catch (error) {
    console.error("Error fetching restaurants:", error);
    res.status(500).json({ error: "Failed to retrieve data." });
  }
});

// Get single restaurant by id
app.get('/API/Restaurants/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await db.collection('Restaurants').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    const raw = doc.data();
    const sanitised = sanitiseRecord(raw);
    res.json({ id: doc.id, ...sanitised });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Failed to retrieve restaurant.' });
  }
});

// Create a new restaurant
app.post('/API/Restaurants', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.Name_EN && !payload.Name_TC) {
      return res.status(400).json({ error: 'Name_EN or Name_TC is required.' });
    }
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection('Restaurants').add(payload);
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    res.status(500).json({ error: 'Failed to create restaurant.' });
  }
});

// Update an existing restaurant (partial update)
app.put('/API/Restaurants/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    delete payload.createdAt;
    await db.collection('Restaurants').doc(id).set(payload, { merge: true });
    await db.collection('Restaurants').doc(id).update({
      modifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error updating restaurant:', error);
    res.status(500).json({ error: 'Failed to update restaurant.' });
  }
});

// Delete a restaurant
app.delete('/API/Restaurants/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.collection('Restaurants').doc(id).delete();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting restaurant:', error);
    res.status(500).json({ error: 'Failed to delete restaurant.' });
  }
});

// Get all users (publicly accessible metadata only)
app.get('/API/Users', async (req, res) => {
  try {
    const snapshot = await db.collection('Users').get();
    const users = snapshot.docs.map(doc => {
      const raw = doc.data();
      const sanitised = sanitiseRecord(raw);
      return {
        id: doc.id,
        ...sanitised
      };
    });
    res.json({ count: users.length, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Get single user by id (publicly accessible metadata only)
app.get('/API/Users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doc = await db.collection('Users').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    const raw = doc.data();
    const sanitised = sanitiseRecord(raw);
    res.json({ id: doc.id, ...sanitised });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to retrieve user.' });
  }
});

// Create a new user record (protected)
app.post('/API/Users', authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    // Basic validation: require uid or email
    if (!payload.uid && !payload.email) {
      return res.status(400).json({ error: 'uid or email is required.' });
    }

    // If the request is coming from an authenticated user, ensure they are creating their own record
    if (payload.uid && req.uid !== payload.uid) {
      return res.status(403).json({ error: 'Forbidden: cannot create record for another user.' });
    }

    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection('Users').add(payload);
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Update an existing user (partial update) (protected)
app.put('/API/Users/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    delete payload.createdAt;

    // Fetch the existing user document to validate ownership
    const docRef = db.collection('Users').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    const existing = docSnap.data() || {};

    // If the document contains a uid field, enforce that the authenticated uid matches
    if (existing.uid && existing.uid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden: cannot modify another user.' });
    }

    // If payload tries to set uid to a different value, forbid it
    if (payload.uid && payload.uid !== existing.uid && existing.uid) {
      return res.status(403).json({ error: 'Forbidden: cannot change uid.' });
    }

    await docRef.set(payload, { merge: true });
    await docRef.update({ modifiedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.status(204).send();
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

// Delete a user (protected)
app.delete('/API/Users/:id', authenticate, async (req, res) => {
  try {
    const id = req.params.id;

    const docRef = db.collection('Users').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Not found' });
    }
    const existing = docSnap.data() || {};

    // If the document contains a uid field, enforce that the authenticated uid matches
    if (existing.uid && existing.uid !== req.uid) {
      return res.status(403).json({ error: 'Forbidden: cannot delete another user.' });
    }

    await docRef.delete();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`REST API Service running at http://localhost:${port}`);
  console.log(`Restaurant endpoint: http://localhost:${port}/API/Restaurants`);
  console.log(`User endpoint: http://localhost:${port}/API/Users`);
});