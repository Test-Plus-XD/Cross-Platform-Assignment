import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const app = express();
const port = 3000;

// --- Firebase Initialization ---
try {
  const serviceAccount = JSON.parse( await readFile(new URL('./serviceAccountKey.json', import.meta.url)));

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

// --- CRUD endpoints ---
// Get all restaurants
app.get('/API/Restaurants', async (req, res) => {
  try {
    const snapshot = await db.collection('Restaurants').get();

    const restaurantList = snapshot.docs.map(doc => ({
      id: doc.id, // Include the Firestore Document ID
      ...doc.data()
    }));

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
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Failed to retrieve restaurant.' });
  }
});

// Create a new restaurant
app.post('/API/Restaurants', async (req, res) => {
  try {
    const payload = req.body || {};
    // Validate minimal fields (Name_EN or Name_TC, District etc)
    if (!payload.Name_EN && !payload.Name_TC) {
      return res.status(400).json({ error: 'Name_EN or Name_TC is required.' });
    }
    // Add server timestamp or any other server-side fields
    payload.createdAt = admin.firestore.FieldValue.serverTimestamp();

    // Create document with auto id
    const docRef = await db.collection('Restaurants').add(payload);

    // Respond with new id
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
    // Remove immutable fields from payload if present
    delete payload.createdAt;

    // Apply update (merge true)
    await db.collection('Restaurants').doc(id).set(payload, { merge: true });

    // Optionally update a modifiedAt timestamp
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