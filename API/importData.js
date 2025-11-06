import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// 1. Initialize Firebase Admin SDK using your service key
const serviceAccount = JSON.parse(
  await readFile(new URL('./serviceAccountKey.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true,
  projectId: serviceAccount.project_id,
  databaseId: "default"
});

const db = admin.firestore();
db.settings({ databaseId: '(default)' });
const batchSize = 499; // Keep it safely below the limit of 500
const collectionName = 'Restaurants'; // This will be your Firestore collection name

// Executes the bulk upload to Firestore.
async function uploadData() {
  try {
    console.log(`Starting data import into collection: ${collectionName}...`);

    // Load your data file
    const dataFile = await readFile(new URL('../Restaurantlicences_CSV/vegetarian_restaurants_hk.json', import.meta.url));
    const jsonData = JSON.parse(dataFile);

    const restaurantArray = jsonData;

    if (!restaurantArray || restaurantArray.length === 0) {
      console.error("No restaurant data found in the 'restaurants' array.");
      return;
    }

    console.log(`Found ${restaurantArray.length} items to upload.`);

    // 2. Process data in batches
    let batch = db.batch();
    let batchCounter = 0;
    let totalWrites = 0;

    for (const data of restaurantArray) {
      // Get a reference to the new document. Firestore will auto-generate the ID.
      const docRef = db.collection(collectionName).doc();

      // Add the operation to the current batch
      batch.set(docRef, data);
      batchCounter++;
      totalWrites++;

      // Commit the batch if it reaches the size limit
      if (batchCounter === batchSize) {
        await batch.commit();
        console.log(`Committed batch #${Math.ceil(totalWrites / batchSize)} (${batchSize} writes).`);

        // Start a new batch
        batch = db.batch();
        batchCounter = 0;
      }
    }

    // 3. Commit the final remaining batch
    if (batchCounter > 0) {
      await batch.commit();
      console.log(`Committed final batch with ${batchCounter} writes. Total records uploaded: ${totalWrites}.`);
    }
    console.log('✅ Import process completed successfully!');
  } catch (error) {
    console.error('❌ Error during data upload:', error);
  }
}

uploadData().then(() => {
  process.exit(0);
});