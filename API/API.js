import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const app = express();
const port = 3000;

// --- Firebase Initialization ---
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
db.settings({ databaseId: '(default)' });

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

// Start server
app.listen(port, () => {
  console.log(`REST API Service running at http://localhost:${port}`);
  console.log(`Data endpoint: http://localhost:${port}/API/Restaurants`);
});